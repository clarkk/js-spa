import * as frm from 'frm';

export function fieldset_group(store){
	let active = null;
	const items = new Map(), o = {
		add(name, container_fields, container_buttons){
			if(items.has(name)) throw Error(`Fieldset '${name}' already exists`);
			
			const item = fieldset_item(store, container_fields, container_buttons);
			items.set(name, item);
			return item;
		}
	};
	return Object.freeze(o);
}

function fieldset_item(store, container_fields, container_buttons){
	let fieldset = null;
	const o = {
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
				},
				buttons_html(html){
					container_buttons.innerHTML = html;
				}
			});
			fieldset.render();
		}
	};
	return Object.freeze(o);
}