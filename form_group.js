import * as dom from 'dom';
import * as frm from 'frm';

let navigation;

init({
	stepper({name, id, icon, title}){
		return `
			<div id="${id}" class="step">
				<i class="bi bi-${icon}"></i>
				${title}
			</div>
		`;
	},
	tabs({name, id, title}){
		return `
			<a id="${id}" href="#${name}">
				${title}
			</a>
		`;
	}
});

export function init(renderers){
	navigation = Object.freeze({
		stepper: renderers.stepper,
		tabs: renderers.tabs
	});
}

export function stepper(host){
	const group = fieldset_group(), steps = new Map(), step_names = [], step_data = [], o = {
		add(name, icon, title, factory){
			const step_index = step_names.length, id = dom.id(), scope = group.add(name, factory, {
				post_data(){
					if(step_index === 0) return null;
					return {...step_data[step_index - 1]};
				}
			});
			steps.set(name, {
				id,
				icon,
				title
			});
			step_names.push(name);
			return scope;
		},
		active: group.active,
		activate: group.activate,
		next(){
			return change(1);
		},
		back(){
			return change(-1);
		},
		html: Object.freeze({
			navigation(){
				return `
					<div class="stepper">
						${Array.from(steps, ([name, step])=>
							navigation.stepper({name, ...step})
						).join('')}
					</div>
				`;
			},
			content: group.html.content
		}),
		mount(){
			let step_index = 0;
			const last_index = step_names.length - 1;
			group.scopes().forEach(scope=>{
				const f = scope.fieldset();
				
				if(step_index > 0 && !f.buttons(frm.BTN_BACK, true)){
					f.apply_button(frm.BTN_BACK, {
						click(){
							o.back();
						}
					});
				}
				
				if(step_index < last_index && !f.buttons(frm.BTN_NEXT, true)){
					f.apply_button(frm.BTN_NEXT, {
						click(){
							o.next();
						}
					});
				}
				
				f.move_button_last(frm.BTN_ACTION).render_fields();
				step_index++;
			});
			
			group.select();
			render();
			
			return o;
		}
	};
	
	function change(move){
		const active = group.active(), current_index = index(active.name), target_index = current_index + move;
		if(target_index < 0 || target_index >= step_names.length) return false;
		
		step_data[current_index] = active.fieldset().val();
		
		group.select(step_names[target_index]);
		if(step_data[target_index] != null) group.active().fieldset().reset(step_data[target_index]);
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
		add(name, title, factory){
			const scope = group.add(name, factory), id = dom.id();
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
			
			tabs.forEach((tab, key)=>{
				document.getElementById(tab.id).classList.toggle('active', key === name);
			});
			
			host.write.buttons(group.html.buttons());
			group.active().fieldset().render_buttons().focus();
			
			return true;
		},
		html: Object.freeze({
			navigation(){
				return `
					<div class="tabs">
						${Array.from(tabs, ([name, tab])=>
							navigation.tabs({name, ...tab})
						).join('')}
					</div>
				`;
			},
			content: group.html.content
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
		add(name, factory, methods={}){
			if(scopes.has(name)) throw Error(`Fieldset '${name}' already exists`);
			
			const scope = fieldset_scope(name, factory, methods);
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
				active = scope;
				scopes.forEach(scope=>
					scope.activate(active === scope)
				);
			}
			return active.name;
		},
		scopes(name){
			if(!arguments.length) return scopes.values();
			if(!scopes.has(name)) throw Error(`Fieldset '${name}' does not exist`);
			return scopes.get(name);
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
	
	function get_scope(name=null){
		if(!scopes.size) throw Error(`Fieldset group is empty`);
		if(name === null) return o.scopes().next().value;
		return o.scopes(name);
	}
	
	return Object.freeze(o);
}

function fieldset_scope(name, factory, methods={}){
	let scope_html = '';
	const id = dom.id(), scope_context = Object.freeze({
		...methods,
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