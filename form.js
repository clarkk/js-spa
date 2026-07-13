import * as fmt from 'fmt';
import * as dom from 'dom';

export const
	TYPE_HIDDEN = 'hidden',
	TYPE_BLIND = 'blind',
	TYPE_PASSWORD = 'password',
	TYPE_TEXTAREA = 'textarea';

const KEY_TAB='Tab', KEY_ESC='Escape', KEY_ENTER='Enter', KEY_ARROW_DOWN='ArrowDown', KEY_ARROW_UP='ArrowUp',
	INP_DISABLED='disabled', INP_READONLY='readonly',
	BTN_ACTION='action', BTN_BACK='back', BTN_NEXT='next',
	EVENT_INPUT='input', EVENT_CHANGE='change',
	BTN_CTA_NAMES=[BTN_ACTION,BTN_NEXT];

export function fieldset(store, fields, buttons){
	const field_names = {}, tabs = create_tabs(), o = {
		store,
		field_id(name){
			valid_field_name(name);
			return fields.get(name).id;
		},
		button_id(name){
			valid_button_name(name);
			return buttons[name].id;
		},
		field(name, value){
			valid_field_name(name);
			return create_field(o, name, value);
		},
		fields(name){
			if(!arguments.length) return fields;
			valid_field_name(name);
			return fields.get(name);
		},
		button(name){
			valid_button_name(name);
			return create_button(o, name);
		},
		buttons(name){
			if(!arguments.length) return buttons;
			valid_button_name(name);
			return buttons[name];
		},
		html_field(name, label, width){
			return `
				<div class="field-label" style="width:${width ? width+'px' : '100%'}">
					<label>${fmt.html(label)}</label>
					<div id="${o.field_id(name)}" class="field-input"></div>
				</div>
			`;
		},
		html_button(name){
			return `<div id="${o.button_id(name)}"></div>`;
		},
		apply_fields(apply_fields){
			if(fields?.size) throw Error('Fields are already applied');
			
			if(Array.isArray(apply_fields) && apply_fields.length){
				unique_fields(apply_fields);
				fields = new Map(deep_clone(apply_fields));
				fields.forEach((field, name)=>{
					/*if(field == null){
						field = {};
						fields.set(name, field);
					}*/
					if(!field.id) field.id = dom.id();
					if(field.type !== TYPE_HIDDEN) field.tabindex = tabs.tabindex();
					if(!field.css) field.css = {style: [], class: []};
				});
			}
			else if(apply_fields !== null) throw Error('Fields must be defined');
		},
		render(values={}){
			o.render_fields(values);
			o.render_buttons();
			return o;
		},
		render_fields(values={}){
			if(fields) fields.forEach((field, name)=>{
				if([TYPE_HIDDEN,TYPE_BLIND].includes(field.type)) return;
				
				const value = values[name] ?? null;
				o.field(name, value).render();
			});
			return o;
		},
		render_buttons(){
			for(const k in buttons) o.button(k).render();
			return o;
		},
		set_tabindex_field(tabindex, Field){
			tabs.field(tabindex, Field);
		},
		tab(tabindex, e){
			tabs.tab(tabindex, e);
		},
		val(name){
			if(fields === null) return null;
			
			if(!arguments.length){
				const data = {};
				fields.forEach((field,name)=>{
					data[name] = get_input_value(name);
				});
				return data;
			}
			
			if(name){
				valid_field_name(name);
				return get_input_value(name);
			}
		},
		focus(){
			if(fields === null){
				focus_button();
				return o;
			}
			
			let found = false;
			for(const [_,v] of fields){
				if(!v.Field) continue;
				
				if(found){
					if(v.Field.enabled(true)){
						v.Field.focus();
						break;
					}
				}
				else if(v.focus){
					found = true;
					if(v.Field.enabled() && elm_visible(v.Field.input())){
						v.Field.focus();
						break;
					}
				}
			}
			//if(!found) focus_button();
			
			return o;
		}
	};
	
	o.apply_fields(fields);
	
	buttons = deep_clone(buttons);
	for(const k in buttons) apply_button(k, buttons[k]);
	
	function valid_field_name(name){
		if(!field_names[name]) throw Error(`Field '${name}' does not exist in fieldset`);
	}
	
	function valid_button_name(name){
		if(!buttons[name]) throw Error(`Button '${name}' does not exist in fieldset`);
	}
	
	function unique_fields(a){
		a.forEach(v=>{
			if(field_names[v[0]]) throw Error(`Field '${v[0]}' already exists in fieldset`);
			field_names[v[0]] = true;
		});
	}
	
	function get_input_value(name){
		const field = fields.get(name);
		switch(field.type){
		case TYPE_HIDDEN:
		case TYPE_BLIND:
			return field.value || '';
		default: return field.Field.val();
		}
	}
	
	function focus_button(){
		for(const k in buttons){
			if(buttons[k].focus){
				buttons[k].Button.focus();
				return;
			}
		}
		
		for(const k in BTN_CTA_NAMES){
			const button = buttons[BTN_CTA_NAMES[k]];
			if(button){
				button.Button.focus();
				return;
			}
		}
	}
	
	function apply_button(name, button){
		button.id = dom.id();
	}
	
	return Object.freeze(o);
}

function create_field(fieldset, name, value){
	let input, rendered = false;
	const field = fieldset.fields(name), o = {
		render(){
			if(rendered) throw Error(`Field '${name}' is already rendered`);
			
			rendered = true;
			const elm = document.getElementById(field.id), input_id = dom.id();
			if(!elm) throw Error(`Field '${name}' is not found in DOM`);
			
			if(field.ralign) field.css.class.push('text-right');
			
			switch(field.type){
			default:
				elm.innerHTML = `<input id="${input_id}" ${render_css()} type="${field.type || 'text'}" autocomplete="nope" value="${fmt.html(render_value())}">`;
			}
			
			input = document.getElementById(input_id);
			if(input){
				input.addEventListener('keydown', e=>{
					switch(e.key){
					case KEY_TAB:
						e.preventDefault();
						o.tab(e);
						break;
					case KEY_ESC:
						console.log('esc');
						break;
					case KEY_ENTER:
						if(field.type !== TYPE_TEXTAREA || e.ctrlKey){
							e.preventDefault();
							const buttons = fieldset.buttons();
							if(button_click(buttons[BTN_ACTION])) break;
							if(button_click(buttons[BTN_NEXT])) break;
						}
						break;
					}
					
					function button_click(button){
						if(button.Button.hidden()){
							button.Button.click();
							return true;
						}
						return false;
					}
				});
			}
		},
		tab(e){
			fieldset.tab(field.tabindex, e);
		},
		focus(no_selection=false){
			if(!input) return;
			if(no_selection || input.readOnly) input.focus();
			else{
				input.select();
				input.focus();
			}
		},
		readonly(bool){
			if(!o.enabled()) return;
			
			input.readOnly = !!bool;
			apply_input_class(INP_READONLY, bool);
		},
		enabled(visible){
			if(!input || input.disabled) return false;
			return visible && !elm_visible(input) ? false : true;
		},
		val(value){
			if(!arguments.length) return input ? input.value : (field.value || '');
			
			value = value || '';
			if(input){
				input.value = value;
				input.dispatchEvent(new Event(EVENT_INPUT, {bubbles: true}));
				input.dispatchEvent(new Event(EVENT_CHANGE, {bubbles: true}));
			}
			return o;
		},
		input(){
			return input;
		}
	};
	
	field.Field = o;
	if(value != null) field.value = value;
	if('tabindex' in field) fieldset.set_tabindex_field(field.tabindex, o);
	
	function render_css(){
		if(!field.css.class.length && !field.css.style.length) return '';
		
		const list = [];
		if(field.css.class.length) list.push('class="'+field.css.class.join(' ')+'"');
		if(field.css.style.length) list.push('style="'+field.css.style.join('; ')+'"');
		return list.join(' ');
	}
	
	function render_value(){
		return field.value || '';
	}
	
	function apply_input_class(class_name, bool){
		if(bool) input.classList.add(class_name);
		else input.classList.remove(class_name);
	}
	
	return Object.freeze(o);
}

function create_button(fieldset, name){
	let icon, value, input, loading = false, hidden = true;
	const button = fieldset.buttons(name), o = {
		render(){
			const elm = document.getElementById(button.id), input_id = dom.id();
			if(!elm) throw Error(`Button '${name}' is not found in DOM`);
			
			switch(name){
			case BTN_ACTION:
				icon = button.icon || 'check-lg';
				value = fieldset.store.t(button.value || 'BTN_OK');
				break;
			case BTN_BACK:
				icon = button.icon || 'chevron-left';
				value = fieldset.store.t(button.value || 'BTN_BACK');
				break;
			case BTN_NEXT:
				icon = button.icon || 'chevron-right';
				value = fieldset.store.t(button.value || 'BTN_NEXT');
				break;
			}
			
			elm.innerHTML = `<button id="${input_id}"><i class="bi bi-${icon}"></i>${value}</button>`;
			input = document.getElementById(input_id);
			if(input) input.addEventListener('click', _=>o.click());
		},
		click(){
			if(loading) return;
			
			if(button.click){
				o.loading(true);
				button.click.call(fieldset, o);
			}
			else throw Error(`Button '${name}' has no action`);
		},
		loading(bool){
			if(bool){
				input.classList.add('loading');
				/*fieldset.API?.context({
					Button: o
				});*/
			}
			else input.classList.remove('loading');
			
			const fields = fieldset.fields();
			if(fields) fields.forEach(field=>{
				if(![TYPE_HIDDEN,TYPE_BLIND].includes(field.type)) field.Field.readonly(bool);
			});
			loading = !!bool;
		},
		hide(bool){
			hidden = !!bool;
		},
		hidden(){
			return hidden;
		},
		focus(){
			input.focus();
		}
	};
	
	button.Button = o;
	
	return Object.freeze(o);
}

/*export function Fieldset_api(api_send, api, fields, buttons){
	return Object.freeze(Object.assign({
		API: api,
		api_send
	}, Fieldset(fields, buttons)));
}

export function Fieldset(fields, buttons={}){
	const _field_names = {}, _tabs = Tabs(), f = {
		
		reapply_fields(apply_fields){
			for(const k in _field_names) delete _field_names[k];
			_tabs.clear();
			fields = null;
			f.apply_fields(apply_fields);
		},
		
		hide_button(name, bool){
			$('#'+o.button_id(name)).css('display', !!bool ? 'block' : 'none');
			o.buttons(name).Button.hide(bool);
		},
		
	};
	
}*/

function create_tabs(){
	let tabindex = 0, tabs = {};
	return {
		tabindex(){
			return tabindex++;
		},
		field(index, field){
			tabs[index] = field;
		},
		tab(index, e){
			if(tabindex === 0) return;
			const direction = e?.shiftKey ? -1 : 1;
			for(let i = 0; i < tabindex; i++){
				index = (index + direction + tabindex) % tabindex;
				if(tabs[index]?.enabled(true)){
					tabs[index].focus();
					break;
				}
			}
		},
		clear(){
			tabindex = 0;
			tabs = {};
		}
	};
}

function deep_clone(obj){
	if(obj === null || typeof obj !== 'object') return obj;
	
	if(Array.isArray(obj)) return obj.map(v=>deep_clone(v));
	
	const clone = {};
	for(const key in obj){
		if(Object.prototype.hasOwnProperty.call(obj, key)) clone[key] = deep_clone(obj[key]);
	}
	return clone;
}

function elm_visible(elm){
	return elm && (elm.offsetWidth || elm.offsetHeight || elm.getClientRects().length);
}