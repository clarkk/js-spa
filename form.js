import * as fmt from 'fmt';
import * as dom from 'dom';

export const
	TYPE_HIDDEN = 'hidden',
	TYPE_BLIND = 'blind',
	TYPE_PASSWORD = 'password',
	TYPE_TEXTAREA = 'textarea';

/*const KEY_TAB='Tab', KEY_ESC='Escape', KEY_ENTER='Enter', KEY_ARROW_DOWN='ArrowDown', KEY_ARROW_UP='ArrowUp',
	INP_DISABLED='disabled', INP_VISIBLE='visible', INP_READONLY='readonly',
	BTN_ACTION='action', BTN_BACK='back', BTN_NEXT='next',
	EVENT_INPUT='input', EVENT_CHANGE='change',
	BTN_CTA_NAMES=[BTN_ACTION,BTN_NEXT];*/

export function fieldset(fields, buttons){
	const field_names = {}, tabs = create_tabs(), o = {
		field_id(name){
			valid_field_name(name);
			//return fields.get(name).id;
		},
		html_field(name, label, width){
			return `<div class="field-label" style="width:${width ? width+'px' : '100%'}">
	<label>${fmt.html(label)}</label>
	<div id="${o.field_id(name)}" class="field-input"></div>
</div>`;
		},
		apply_fields(apply_fields){
			if(fields?.size) throw Error('Fields are already applied');
			
			if(Array.isArray(apply_fields) && apply_fields.length){
				unique_fields(apply_fields);
				fields = new Map(structuredClone(apply_fields));
				fields.forEach((field, name)=>{
					/*if(field == null){
						field = {};
						fields.set(name, field);
					}*/
					if(!field.id) field.id = dom.id();
					if(field.type !== TYPE_HIDDEN) field.tabindex = tabs.tabindex();
					//if(!field.css) field.css = {style: [], class: []};
				});
			}
			else if(apply_fields !== null) throw Error('Fields must be defined');
		},
	};
	
	o.apply_fields(fields);
	
	function valid_field_name(name){
		if(!field_names[name]) throw Error(`Field '${name}' does not exist in fieldset`);
	}
	
	function unique_fields(a){
		a.forEach(v=>{
			if(field_names[v[0]]) throw Error(`Field '${v[0]}' already exists in fieldset`);
			field_names[v[0]] = true;
		});
	}
	
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
		
		button_id(name){
			valid_button_name(name);
			return buttons[name].id;
		},
		
		reapply_fields(apply_fields){
			for(const k in _field_names) delete _field_names[k];
			_tabs.clear();
			fields = null;
			f.apply_fields(apply_fields);
		},
		field(name, value){
			valid_field_name(name);
			return Field(this, name, value);
		},
		button(name){
			valid_button_name(name);
			return Button(this, name);
		},
		fields(name){
			if(!arguments.length) return fields;
			
			valid_field_name(name);
			return fields.get(name);
		},
		tabs(){
			return _tabs;
		},
		buttons(name){
			if(!arguments.length) return buttons;
			
			valid_button_name(name);
			return buttons[name];
		},
		
		render(values={}){
			this.render_fields(values);
			this.render_buttons();
			return this;
		},
		render_fields(values={}){
			if(fields) fields.forEach((field, name)=>{
				if([TYPE_HIDDEN,TYPE_BLIND].includes(field.type)) return;
				
				let value = values[name] ?? null;
				this.field(name, value).render();
			});
			return this;
		},
		render_buttons(){
			for(const k in buttons) this.button(k).render();
			return this;
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
		hide_button(name, bool){
			$('#'+this.button_id(name)).css('display', !!bool ? 'block' : 'none');
			this.buttons(name).Button.hide(bool);
		},
		focus(){
			if(fields === null){
				focus_button();
				return this;
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
					if(v.Field.enabled()){
						if(v.Field.input().is(':'+INP_VISIBLE)) v.Field.focus();
						break;
					}
				}
			}
			//if(!found) focus_button();
			
			return this;
		}
	};
	
	
	
	buttons = $.extend(true, {}, buttons);
	for(const k in buttons) apply_button(k, buttons[k]);
	
	
	
	function apply_button(name, button){
		button.id = dom.id();
	}
	
	
	
	function valid_button_name(name){
		if(!buttons[name]) throw Error(`Button '${name}' does not exist in fieldset`);
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
	
	function get_input_value(name){
		const field = fields.get(name);
		switch(field.type){
		case TYPE_HIDDEN:
		case TYPE_BLIND:
			return field.value || '';
		default: return field.Field.val();
		}
	}
	
	return Object.freeze(f);
}

function Button(fieldset, name){
	let icon, value, input, loading = false, hidden = true;
	const button = fieldset.buttons(name), b = {
		render(){
			const elm = $('#'+button.id), input_id = dom.id();
			if(!elm.length) throw Error(`Button '${name}' is not found in DOM`);
			
			switch(name){
			case BTN_ACTION:
				icon = button.icon || 'check-lg';
				value = lng.get(button.value || 'BTN_OK');
				break;
			case BTN_BACK:
				icon = button.icon || 'chevron-left';
				value = lng.get(button.value || 'BTN_BACK');
				break;
			case BTN_NEXT:
				icon = button.icon || 'chevron-right';
				value = lng.get(button.value || 'BTN_NEXT');
				break;
			}
			
			elm.html(`<button id="${input_id}"><i class="bi bi-${icon}"></i>${value}</button>`);
			input = $('#'+input_id).click(_=>this.click());
		},
		click(){
			if(loading) return;
			
			if(button.click){
				this.loading(true);
				button.click.call(fieldset, this);
			}
			else throw Error(`Button '${name}' has no action`);
		},
		loading(bool){
			if(bool){
				input.addClass('loading');
				fieldset.API?.context({
					Button: this
				});
			}
			else input.removeClass('loading');
			
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
	
	button.Button = b;
	
	return Object.freeze(b);
}

function Field(fieldset, name, value){
	let input, rendered = false;
	const field = fieldset.fields(name), f = {
		render(){
			if(rendered) throw Error(`Field '${name}' is already rendered`);
			
			rendered = true;
			const elm = $('#'+field.id), input_id = dom.id();
			if(!elm.length) throw Error(`Field '${name}' is not found in DOM`);
			
			if(field.ralign) field.css.class.push('text-right');
			
			switch(field.type){
			default:
				elm.html(`<input id="${input_id}" ${render_css()} type="${field.type || 'text'}" autocomplete="nope" value="${fmt.html(render_value(), true)}">`);
			}
			
			input = $('#'+input_id).keydown(e=>{
				switch(e.key){
				case KEY_TAB:
					e.preventDefault();
					f.tab(e);
					break;
				case KEY_ESC:
					console.log('esc')
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
		},
		tab(e){
			fieldset.tabs().tab(field.tabindex, e);
		},
		focus(no_selection){
			if(no_selection || input.prop(INP_READONLY)) input.focus();
			else input.select().focus();
		},
		readonly(bool){
			if(!this.enabled()) return;
			
			input.prop(INP_READONLY, bool);
			apply_input_class(INP_READONLY, bool);
		},
		enabled(visible){
			if(!input?.length || input.is(':'+INP_DISABLED)) return false;
			return visible && !input.is(':'+INP_VISIBLE) ? false : true;
		},
		val(value){
			if(!arguments.length) return input?.length ? input.val() : (field.value || '');
			
			value = value || '';
			input.val(value).trigger(EVENT_INPUT).trigger(EVENT_CHANGE);
			return this;
		},
		input(){
			return input;
		}
	};
	
	field.Field = f;
	if(value != null) field.value = value;
	if('tabindex' in field) fieldset.tabs().field(field.tabindex, f);
	
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
		if(bool) input.addClass(class_name);
		else input.removeClass(class_name);
	}
	
	return Object.freeze(f);
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