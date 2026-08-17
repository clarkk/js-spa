import * as dom from 'dom';

export function tabs(buttons_html){
	const group = fieldset_group(), tabs = new Map(), o = {
		add(name, title, content){
			const item = group.add(name, content), id = dom.id();
			tabs.set(name, {
				id,
				title
			});
			return item;
		},
		active(){
			return group.active();
		},
		activate(name=null){
			name = group.activate(name);
			if(!name) return false;
			
			tabs.forEach((tab, key)=>{
				document.getElementById(tab.id).classList.toggle('active', key === name);
			});
			
			buttons_html(group.html_buttons());
			group.active().fieldset().render_buttons();
			
			return true;
		},
		html_tabs(){
			return Array.from(tabs.entries(), ([name, tab])=>
				`<a id="${tab.id}" href="#${name}">${tab.title}</a>`
			).join('');
		},
		html_content(){
			return group.html_content();
		},
		mount(){
			tabs.forEach((tab, name)=>{
				const elm = document.getElementById(tab.id);
				elm.addEventListener('click', e=>{
					e.preventDefault();
					o.activate(name);
				});
			});
			
			group.items().forEach(item=>{
				item.fieldset().render_fields();
			});
			
			o.activate();
			
			return o;
		}
	};
	
	return Object.freeze(o);
}

function fieldset_group(){
	let active = null;
	const items = new Map(), o = {
		add(name, content){
			if(items.has(name)) throw Error(`Fieldset '${name}' already exists`);
			
			const item = fieldset_item(name, content);
			items.set(name, item);
			return item;
		},
		active(){
			return active;
		},
		item(name){
			if(!items.has(name)) throw Error(`Fieldset '${name}' does not exist`);
			return items.get(name);
		},
		items(){
			return items.values();
		},
		activate(name=null){
			const item = get_item(name);
			if(item !== active){
				if(fieldset_sending()) return null;
				
				active = item;
				items.forEach(item=>
					item.activate(active === item)
				);
			}
			return active.name;
		},
		html_content(){
			return Array.from(o.items(), item=>
				item.html()
			).join('');
		},
		html_buttons(){
			return active.html_buttons();
		}
	};
	
	function fieldset_sending(){
		for(const item of o.items()){
			if(item.fieldset().sending()) return true;
		}
		return false;
	}
	
	function get_item(name=null){
		if(!items.size) throw Error(`Fieldset group is empty`);
		if(name === null) return o.items().next().value;
		return o.item(name);
	}
	
	return Object.freeze(o);
}

function fieldset_item(name, content){
	let item_html = '';
	const id = dom.id(), m = Object.freeze({
		content_html(html){
			item_html = html || '';
		}
	}), fieldset = content.call(m);
	return Object.freeze({
		name,
		html(){
			return `<div id="${id}" style="display:none">${item_html}</div>`;
		},
		activate(bool=true){
			const elm = document.getElementById(id);
			if(elm) elm.style.display = bool ? '' : 'none';
			fieldset.activate(bool);
		},
		html_buttons(){
			return fieldset.html_buttons();
		},
		fieldset(){
			return fieldset;
		}
	});
}