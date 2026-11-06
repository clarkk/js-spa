import * as dom from 'dom';

export function stepper(host){
	const group = fieldset_group(), steps = new Map(), step_names = [], o = {
		add(name, icon, title, content){
			const scope = group.add(name, content), id = dom.id();
			steps.set(name, {
				id,
				icon,
				title,
				//data: {}
			});
			step_names.push(name);
			return scope;
		},
		active: group.active,
		activate: group.activate,
		next(){
			return direction(1);
		},
		back(){
			return direction(-1);
		},
		html: Object.freeze({
			navigation(){
				return Array.from(steps.entries(), ([name, step])=>`
					<div id="${step.id}" class="step">
						<i class="bi bi-${step.icon}"></i>
						${step.title}
					</div>
				`).join('');
			},
			content(){
				return group.html.content();
			}
		}),
		mount(){
			group.scopes().forEach(scope=>{
				scope.fieldset().render_fields();
			});
			
			group.select();
			render();
			
			return o;
		}
	};
	
	function direction(move){
		const target_index = index(group.active().name) + move;
		if(target_index < 0 || target_index >= step_names.length) return false;
		
		if(group.select(step_names[target_index]) === null) return false;
		
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
		
		host.write.buttons(active.html.buttons());
		active.fieldset().render_buttons().focus();
	}
	
	function index(name){
		return step_names.indexOf(name);
	}
	
	return Object.freeze(o);
}

export function tabs(host){
	const group = fieldset_group(), tabs = new Map(), o = {
		add(name, title, content){
			const scope = group.add(name, content), id = dom.id();
			tabs.set(name, {
				id,
				title
			});
			return scope;
		},
		active: group.active,
		activate: group.activate,
		select(name=null){
			name = group.select(name);
			if(name === null) return false;
			
			tabs.forEach((tab, key)=>{
				document.getElementById(tab.id).classList.toggle('active', key === name);
			});
			
			host.write.buttons(group.html.buttons());
			group.active().fieldset().render_buttons().focus();
			
			return true;
		},
		html: Object.freeze({
			navigation(){
				return Array.from(tabs.entries(), ([name, tab])=>`
					<a id="${tab.id}" href="#${name}">
						${tab.title}
					</a>
				`).join('');
			},
			content(){
				return group.html.content();
			}
		}),
		mount(){
			tabs.forEach((tab, name)=>{
				const elm = document.getElementById(tab.id);
				elm.addEventListener('click', e=>{
					e.preventDefault();
					o.select(name);
				});
			});
			
			group.scopes().forEach(scope=>{
				scope.fieldset().render_fields();
			});
			
			o.select();
			
			return o;
		}
	};
	
	return Object.freeze(o);
}

function fieldset_group(){
	let active = null;
	const scopes = new Map(), o = {
		add(name, factory){
			if(scopes.has(name)) throw Error(`Fieldset '${name}' already exists`);
			
			const scope = fieldset_scope(name, factory);
			scopes.set(name, scope);
			return scope;
		},
		active(){
			return active;
		},
		activate(bool){
			active.activate(bool);
		},
		select(name=null){
			const scope = get_scope(name);
			if(scope !== active){
				if(fieldset_sending()) return null;
				
				active = scope;
				scopes.forEach(scope=>
					scope.activate(active === scope)
				);
			}
			return active.name;
		},
		scope(name){
			if(!scopes.has(name)) throw Error(`Fieldset '${name}' does not exist`);
			return scopes.get(name);
		},
		scopes(){
			return scopes.values();
		},
		html: Object.freeze({
			content(){
				return Array.from(o.scopes(), scope=>
					scope.html.content()
				).join('');
			},
			buttons(){
				return active.html.buttons();
			}
		})
	};
	
	function fieldset_sending(){
		for(const scope of o.scopes()){
			if(scope.fieldset().sending()) return true;
		}
		return false;
	}
	
	function get_scope(name=null){
		if(!scopes.size) throw Error(`Fieldset group is empty`);
		if(name === null) return o.scopes().next().value;
		return o.scope(name);
	}
	
	return Object.freeze(o);
}

function fieldset_scope(name, factory){
	let scope_html = '';
	const id = dom.id(), scope_context = Object.freeze({
		write: Object.freeze({
			content(html){
				scope_html = html || '';
			}
		})
	}), fieldset = factory.call(scope_context);
	return Object.freeze({
		name,
		activate(bool=true){
			const elm = document.getElementById(id);
			if(elm) elm.style.display = bool ? '' : 'none';
			fieldset.activate(bool);
		},
		html: Object.freeze({
			content(){
				return `<div id="${id}" style="display:none">${scope_html}</div>`;
			},
			buttons(){
				return fieldset.html.buttons();
			}
		}),
		fieldset(){
			return fieldset;
		}
	});
}