import * as frm from 'frm';

export function group(store){
	let active = null;
	const items = new Map(), o = {
		add(name, container_fields){
			if(items.has(name)) throw Error(`Fieldset '${name}' already exists`);
			
			const item = fieldset_item(store, container_fields);
			items.set(name, item);
			return item;
		},
		activate(bool=true, name=null){
			const item = get_item(name);
			if(active !== item){
				active = item;
				items.forEach(item=>{
					item.activate(active === item);
				});
			}
			return o;
		},
		html_buttons(){
			return Array.from(items.values(), item=>
				item.get().html_buttons()
			).join('');
		}
	};
	
	function get_item(name=null){
		if(name === null){
			if(!items.size) throw Error(`Fieldset group is empty`);
			return items.values().next().value;
		}
		if(!items.has(name)) throw Error(`Fieldset '${name}' does not exist`);
		return items.get(name);
	}
	
	return Object.freeze(o);
}

function fieldset_item(store, container_fields){
	let fieldset = null;
	const o = {
		fieldset(fields, buttons){
			if(fieldset) throw Error('Fieldset is already created');
			
			fieldset = frm.fieldset(store, fields, buttons);
			return o;
		},
		fieldset_action(name, fields, buttons){
			if(fieldset) throw Error('Fieldset is already created');
			
			fieldset = frm.fieldset.action(store, name, fields, buttons);
			return o;
		},
		render(callback){
			if(!fieldset) throw Error('Fieldset has not been created');
			
			callback.call({
				fieldset,
				fields_html(html){
					container_fields.innerHTML = html;
				}
			});
			fieldset.render();
		},
		get(){
			return fieldset;
		}
	};
	return Object.freeze(o);
}