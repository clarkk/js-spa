import * as com from 'com';
import * as frm_error from 'frm_error';

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
			
			container.innerHTML = com.map_details(field.label, entries.length);
			
			details = container.querySelector('details');
			
			const content = details.querySelector('.field-map-content');
			register_summary(details.querySelector('summary'));
			
			for(const [key, values] of entries){
				const child = create_fieldset(field.table, field.fields);
				
				children.set(key, child);
				
				const html = field.layout.call(Object.freeze({
					field(name, label=null, width=null){
						return child.html.field(name, label ? label+' '+key : key, width);
					}
				}), key);
				
				content.insertAdjacentHTML('beforeend', html);
				
				child.render_fields(values ?? {}, field.format ?? {}, field.parse_types ?? {}, false);
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
			const data = {}, error = {};
			for(const [key, child] of children){
				try{
					data[key] = child.val_types();
				}
				catch(err){
					if(!frm_error.is_conversion(err)) throw err;
					
					error[key] = err.body.error;
				}
			}
			
			if(Object.keys(error).length) throw frm_error.error(error, true);
			
			return data;
		},
		error(errors={}, convert_error=false){
			has_error = false;
			
			for(const [key, child] of children){
				child.error(frm_error.error(errors?.[key] ?? {}, convert_error), false);
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

export function register_summary(summary, tabs, elm_visible){
	const index = tabs.tabindex();
	
	tabs.field(index, {
		input(){
			return summary;
		},
		enabled(visible=false){
			return !visible || !!elm_visible(summary);
		},
		focus(){
			summary.focus();
		}
	});
	
	summary.addEventListener('keydown', e=>{
		if(e.key !== 'Tab') return;
		
		e.preventDefault();
		tabs.tab(index, e);
	});
}