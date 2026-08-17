import * as dom from 'dom';

export function stepper(buttons_html){
	const group = fieldset_group(), steps = new Map(), step_names = [], o = {
		add(name, title, content){
			const item = group.add(name, content), id = dom.id();
			steps.set(name, {
				id,
				title
			});
			step_names.push(name);
			return item;
		},
		active(){
			return group.active();
		},
		next(){
			return direction(1);
		},
		previous(){
			return direction(-1);
		},
		html_steps(){
			return Array.from(steps.entries(), ([name, step])=>
				`<div id="${step.id}">${step.title}</div>`
			).join('');
		},
		html_content(){
			return group.html_content();
		},
		mount(){
			group.items().forEach(item=>{
				item.fieldset().render_fields();
			});
			
			group.activate();
			render();
			
			return o;
		}
	};
	
	function direction(move){
		const target_index = index(group.active().name) + move;
		if(target_index < 0 || target_index >= step_names.length) return false;
		
		if(group.activate(step_names[target_index]) === null) return false;
		
		render();
		
		return true;
	}
	
	function render(){
		let step_index = 0;
		const active = group.active(), active_index = index(active.name);
		steps.forEach((step, name)=>{
			const elm = document.getElementById(step.id);
			elm.classList.toggle('active', name === active.name);
			elm.classList.toggle('complete', step_index < active_index);
			step_index++;
		});
		
		buttons_html(active.html_buttons());
		active.fieldset().render_buttons().focus();
	}
	
	function index(name){
		return step_names.indexOf(name);
	}
	
	return Object.freeze(o);
}

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
			if(name === null) return false;
			
			tabs.forEach((tab, key)=>{
				document.getElementById(tab.id).classList.toggle('active', key === name);
			});
			
			buttons_html(group.html_buttons());
			group.active().fieldset().render_buttons().focus();
			
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