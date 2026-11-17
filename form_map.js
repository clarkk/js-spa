import * as fmt from 'fmt';
import * as api from 'api';
import * as frm_types from 'frm_types';

export function create(field, create_fieldset, register_summary){
	let container, details, has_error = false;
	const children = new Map(), o = {
		readonly(bool=true){
			children.forEach(child=>child.readonly(bool));
			return o;
		},
		has_error(){
			return has_error;
		},
		enabled(visible=false){
			return !visible || container.getClientRects().length;
		},
		render(){
			if(typeof field.layout !== 'function') throw Error('Map layout must be defined with html.map()');
			
			container = document.getElementById(field.id);
			if(!container) throw Error(`Map '${field.id}' is not found in DOM`);
			
			const entries = Object.entries(field.value ?? {});
			
			container.innerHTML = `
				<details class="field-map" ${entries.length ? '' : 'hidden'}>
					<summary>
						${fmt.html(field.label ?? '')}
						<span class="field-map-count">${entries.length}</span>
					</summary>
					<div class="field-map-content"></div>
				</details>
			`;
			
			details = container.querySelector('details');
			
			const content = container.querySelector('.field-map-content');
			register_summary(container.querySelector('summary'));
			
			for(const [key, values] of entries){
				const child = create_fieldset(
					field.fields,
					field.model_input ?? null
				);
				
				children.set(key, child);
				
				const html = field.layout.call({
					field(name, label=null, width=null){
						return child.html.field(name, label ? `${label} ${key}` : key, width);
					}
				}, key);
				
				content.insertAdjacentHTML('beforeend', html);
				
				child.render_fields(
					values ?? {},
					field.format ?? {},
					field.parse_types ?? {},
					false
				);
			}
			
			return o;
		},
		init_handlers(){
			children.forEach(child=>child.init_handlers());
		},
		val(values){
			if(!arguments.length){
				return Object.fromEntries(
					Array.from(children, ([key, child])=>[key, child.val()])
				);
			}
			
			for(const [key, child] of children){
				const values_child = values?.[key];
				if(values_child == null) continue;
				
				for(const name of child.fields().keys()){
					if(values_child[name] !== undefined) child.val(name, values_child[name]);
				}
			}
			
			return o;
		},
		val_types(){
			const data = [], errors = [];
			for(const [key, child] of children){
				try{
					data.push([key, child.val_types()]);
				}
				catch(err){
					if(
						!(err instanceof api.HTTP_error) ||
						err.status !== 422 ||
						err.body?.source !== frm_types.SOURCE
					) throw err;
					
					errors.push([key, err.body.error]);
				}
			}
			
			if(errors.length){
				throw new api.HTTP_error(422, {
					error: Object.fromEntries(errors),
					source: frm_types.SOURCE
				});
			}
			
			return Object.fromEntries(data);
		},
		error(errors={}, convert_error=false){
			has_error = false;
			
			for(const [key, child] of children){
				child.error(new api.HTTP_error(422, {
					error: errors?.[key] ?? {},
					source: convert_error ? frm_types.SOURCE : null
				}), false);
				
				if(child.has_error()) has_error = true;
			}
			
			if(has_error) details.open = true;
			return has_error;
		},
		clear_error(){
			has_error = false;
			children.forEach(child=>child.clear_error());
		},
		focus(){
			details.open = true;
			
			for(const child of children.values()){
				if(child.has_error()){
					child.focus();
					return o;
				}
			}
			
			for(const child of children.values()){
				for(const f of child.fields().values()){
					if(f.Field?.enabled(true)){
						f.Field.focus();
						return o;
					}
				}
			}
			
			return o;
		},
		reset(){
			children.forEach(child=>child.reset());
			return o;
		},
		input(){
			return container;
		}
	};
	return Object.freeze(o);
}