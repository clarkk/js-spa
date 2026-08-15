import * as dom from 'dom';
import * as frm from 'frm';

export function group(){
	let active = null;
	const items = new Map(), o = {
		add(name, content){
			if(items.has(name)) throw Error(`Fieldset '${name}' already exists`);
			
			const item = fieldset_item(content);
			items.set(name, item);
			if(!active){
				active = item;
				item.activate(true, true);
			}
			else item.activate(false, true);
			return item;
		},
		activate(name=null){
			const item = get_item(name);
			active = item;
			items.forEach(item=>
				item.activate(active === item)
			);
			return o;
		},
		html_content(){
			return Array.from(items.values(), item=>
				item.html()
			).join('');
		},
		html_buttons(){
			return active.html_buttons();
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

function fieldset_item(content){
	let item_html = '';
	const id = dom.id(), m = Object.freeze({
		content_html(html){
			item_html = html || '';
		}
	}), o = {
		html(){
			return `<div id="${id}" style="display:none">${item_html}</div>`;
		},
		activate(bool=true, skip_dom=false){
			if(!skip_dom) document.getElementById(id).style.display = bool ? '' : 'none';
			fieldset.activate(bool);
		},
		html_buttons(){
			return fieldset.html_buttons();
		}
		/*fieldset(fields, buttons){
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
					//container_fields.innerHTML = html;
				}
			});
			fieldset.render();
		},
		get(){
			return fieldset;
		}*/
	}, fieldset = content.call(m);
	return Object.freeze(o);
}