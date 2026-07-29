import * as frm_types from 'frm_types';
import * as api from 'api';
import * as fmt from 'fmt';
import * as dom from 'dom';

export const
	TYPE_HIDDEN = 'hidden',
	TYPE_BLIND = 'blind',
	TYPE_PASSWORD = 'password',
	TYPE_TEXTAREA = 'textarea',
	TYPE_CHECKBOX = 'checkbox',
	TYPE_DROPDOWN = 'dropdown',
	
	BTN_ACTION = 'action',
	BTN_BACK = 'back',
	BTN_CANCEL = 'cancel',
	BTN_NEXT = 'next',
	BTN_PUT = 'put';

const KEY_TAB='Tab', KEY_ESC='Escape', KEY_ENTER='Enter', KEY_ARROW_DOWN='ArrowDown', KEY_ARROW_UP='ArrowUp',
	EVENT_INPUT='input',
	CLASS_ERROR='error',
	BTN_CTA_NAMES=[BTN_ACTION,BTN_NEXT,BTN_PUT];

fieldset.table = function(store, name, fields, buttons){
	return fieldset(store, fields, buttons, Object.freeze({
		type: 'table',
		name
	}));
};

fieldset.action = function(store, name, fields, buttons){
	return fieldset(store, fields, buttons, Object.freeze({
		type: 'action',
		name
	}));
};

fieldset.query = function(store, name, fields, buttons){
	return fieldset(store, fields, buttons, Object.freeze({
		type: 'query',
		name
	}));
};

export function fieldset(store, fields, buttons, model_input=null){
	let has_error = false, sending = false;
	
	const model_fields = model_input ? store.model_input.get(model_input.type, model_input.name) : null;
	if(model_input && !model_fields) throw Error(`Model input '${model_input.type}:${model_input.name}' does not exist`);
	
	const field_names = {}, tabs = create_tabs(), o = {
		store,
		sending(){
			return sending;
		},
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
			return create_field(o, name, value, model_input);
		},
		fields(name){
			if(!arguments.length) return fields;
			valid_field_name(name);
			return fields.get(name);
		},
		button(name){
			valid_button_name(name);
			return create_button(o, name, send);
		},
		buttons(name){
			if(!arguments.length) return buttons;
			valid_button_name(name);
			return buttons[name];
		},
		html_field(name, label, width){
			const id = o.field_id(name);
			return `
				<div class="field-label" style="width:${width ? width+'px' : '100%'}">
					<label>${fmt.html(label)}</label>
					<div id="${id}" class="field-input"></div>
					<div id="${field_error_id(id)}" class="field-error"></div>
				</div>
			`;
		},
		html_field_inline(name, label, width){
			const id = o.field_id(name);
			return `
				<div class="field-label-inline">
					${fields.get(name).type === TYPE_CHECKBOX ? `
						<label>${fmt.html(label)}</label>
						<div id="${id}" class="field-input"></div>
					` : `
						
					`}
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
					if(field == null){
						field = {};
						fields.set(name, field);
					}
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
				fields.forEach((field, name)=>{
					data[name] = get_input_value(name);
				});
				return data;
			}
			
			if(name){
				valid_field_name(name);
				return get_input_value(name);
			}
		},
		reset(values={}){
			fields.forEach((field, name)=>{
				if(field.Field?.enabled()){
					if(values[name] != null) field.Field.val(values[name]);
					else field.Field.reset();
				}
			});
			return o;
		},
		error(err){
			switch(true){
			case err instanceof api.HTTP_error:
				has_error = false;
				switch(err.status){
				case 400:
					console.error('HTTP 400:', err)
					return true;
				
				case 404:
					console.error('HTTP 404:', err)
					return true;
				
				case 422:
					const error = err.body.error || {};
					fields.forEach((field, name)=>{
						const input = field.Field?.input();
						if(!input) return;
						
						const input_error = error[name] || null;
						input.classList.toggle(CLASS_ERROR, !!input_error);
						if(input_error){
							set_field_error(field.id, input_error);
							has_error = true;
						}
						else clear_field_error(field.id);
					});
					if(has_error) o.focus();
					return true;
				
				case 500:
				case 502:
				case 503:
					console.error('HTTP 500-503:', err)
					return true;
				}
			
			case err instanceof api.Response_JSON_error:
				console.error('res JSON err:', err)
				return true;
			}
			
			return false;
		},
		clear_error(){
			if(!has_error) return o;
			
			has_error = false;
			fields.forEach(field=>{
				field.Field?.input()?.classList.remove(CLASS_ERROR);
				clear_field_error(field.id);
			});
			return o
		},
		focus(){
			if(fields === null){
				focus_button();
				return o;
			}
			if(has_error){
				for(const [_,field] of fields){
					if(field.Field?.enabled(true) && field.Field.input().classList.contains(CLASS_ERROR)){
						field.Field.focus();
						break;
					}
				}
			}
			else{
				let found = false;
				for(const [_,field] of fields){
					if(!field.Field) continue;
					
					if(found){
						if(field.Field.enabled(true)){
							field.Field.focus();
							break;
						}
					}
					else if(field.focus){
						found = true;
						if(field.Field.enabled() && elm_visible(field.Field.input())){
							field.Field.focus();
							break;
						}
					}
				}
			}
			return o;
		}
	};
	
	o.apply_fields(fields);
	
	buttons = deep_clone(buttons);
	for(const k in buttons) apply_button(k, buttons[k]);
	
	async function send(run){
		if(sending) return false;
		
		sending = true;
		try{
			await run();
			return true;
		}
		finally{
			sending = false;
		}
	}
	
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
		let value;
		const field = fields.get(name);
		switch(field.type){
		case TYPE_HIDDEN:
		case TYPE_BLIND:
			value = field.value || '';
		default:
			value = field.Field.val();
		}
		if(!model_fields) return value;
		return frm_types.convert(model_fields, name, value);
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
		
		if(!button.css) button.css = {style: [], class: []};
	}
	
	return Object.freeze(o);
}

function create_field(fieldset, name, value, model_input){
	let input = null, rendered = false;
	const field = fieldset.fields(name), o = {
		render(){
			if(rendered) throw Error(`Field '${name}' is already rendered`);
			
			rendered = true;
			const elm = document.getElementById(field.id), input_id = dom.id();
			if(!elm) throw Error(`Field '${name}' is not found in DOM`);
			
			const label = elm.parentElement?.querySelector('label');
			if(label) label.htmlFor = input_id;
			
			if(field.ralign) field.css.class.push('text-right');
			
			let checkbox_id, checkbox_inner_id;
			switch(field.type){
			case TYPE_CHECKBOX:
				checkbox_id = dom.id();
				checkbox_inner_id = dom.id();
				elm.innerHTML = `
					<div id="${checkbox_id}" class="input-checkbox">
						<input id="${input_id}" type="${TYPE_CHECKBOX}" ${field.value ? 'checked' : ''}>
						<div id="${checkbox_inner_id}" class="input-checkbox-inner"></div>
					</div>
				`;
				break;
			case TYPE_DROPDOWN:
				
				break;
			default:
				const maxlength = input_maxlength();
				elm.innerHTML = `<input id="${input_id}" ${render_css(field.css)} type="${field.type || 'text'}" autocomplete="nope" ${maxlength ? `maxlength="${maxlength}"` : ''} value="${fmt.html(render_value())}">`;
			}
			
			input = document.getElementById(input_id);
			if(!input) return;
			
			input.addEventListener('keydown', async e=>{
				switch(e.key){
				case KEY_TAB:
					e.preventDefault();
					o.tab(e);
					break;
				case KEY_ESC:
					await button_click(fieldset.buttons(BTN_CANCEL));
					break;
				case KEY_ENTER:
					if(field.type !== TYPE_TEXTAREA || e.ctrlKey){
						e.preventDefault();
						const buttons = fieldset.buttons();
						if(await button_click(buttons[BTN_PUT])) break;
						if(await button_click(buttons[BTN_ACTION])) break;
						if(await button_click(buttons[BTN_NEXT])) break;
					}
					break;
				}
			});
			
			input.addEventListener(EVENT_INPUT, _=>{
				input.classList.remove(CLASS_ERROR);
				clear_field_error(field.id);
			});
			
			switch(field.type){
			case TYPE_CHECKBOX:
				init_checkbox(checkbox_id, checkbox_inner_id);
				break;
			}
			
			return o;
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
		},
		enabled(visible){
			if(!input || input.disabled) return false;
			return visible && !elm_visible(input) ? false : true;
		},
		val(value){
			if(!arguments.length){
				if(field.type === TYPE_CHECKBOX) return !!input.checked;
				return input.value || '';
			}
			
			if(value == null) value = '';
			if(input){
				if(field.type === TYPE_CHECKBOX) input.checked = !!value;
				else input.value = value;
				input.dispatchEvent(new Event(EVENT_INPUT));
			}
			return o;
		},
		reset(){
			o.val(field.value);
		},
		input(){
			return input;
		}
	};
	
	field.Field = o;
	if(value != null) field.value = value;
	if('tabindex' in field) fieldset.set_tabindex_field(field.tabindex, o);
	
	async function button_click(button){
		if(!button?.Button || button.Button.hidden()) return false;
		
		await button.Button.click();
		return false;
	}
	
	function init_checkbox(checkbox_id, checkbox_inner_id){
		const checkbox = document.getElementById(checkbox_id), checkbox_inner = document.getElementById(checkbox_inner_id);
		input.addEventListener('focus', _=>checkbox.classList.add('focus'));
		input.addEventListener('blur', _=>checkbox.classList.remove('focus'));
		input.addEventListener(EVENT_INPUT, e=>{
			checkbox_inner.classList.toggle('checked', e.target.checked);
		});
		if(input.checked) checkbox_inner.classList.add('checked');
	}
	
	function input_maxlength(){
		if(!model_input) return null;
		
		const table = fieldset.store.model_input.table_resource(model_input.name);
		if(!table) throw Error(`Table resouce '${model_input.name}' does not exist`);
		
		const column = fieldset.store.db_schema.get_column(table, name);
		if(!column) throw Error(`DB schema '${table}.${name}' does not exist`);
		
		return column.length;
	}
	
	function render_value(){
		return field.value ?? '';
	}
	
	return Object.freeze(o);
}

function create_button(fieldset, name, send){
	let icon = '', text = '', input = null, loading = false, hidden = false;
	const button = fieldset.buttons(name), o = {
		render(){
			const elm = document.getElementById(button.id), input_id = dom.id();
			if(!elm) throw Error(`Button '${name}' is not found in DOM`);
			
			switch(name){
			case BTN_ACTION:
				icon = button.icon || 'check-lg';
				text = fieldset.store.t(button.text || 'BTN_OK');
				break;
			case BTN_BACK:
				icon = button.icon || 'chevron-left';
				text = fieldset.store.t(button.text || 'BTN_BACK');
				break;
			case BTN_CANCEL:
				icon = button.icon || 'x-lg';
				text = fieldset.store.t(button.text || 'BTN_CANCEL');
				break;
			case BTN_NEXT:
				icon = button.icon || 'chevron-right';
				text = fieldset.store.t(button.text || 'BTN_NEXT');
				break;
			case BTN_PUT:
				icon = button.icon || 'check-lg';
				text = fieldset.store.t(button.text || 'BTN_SAVE');
				break;
			}
			
			elm.innerHTML = `<button id="${input_id}" ${render_css(button.css)}><i class="bi bi-${icon}"></i>${text}</button>`;
			input = document.getElementById(input_id);
			if(!input) return;
			
			input.addEventListener('click', _=>o.click());
		},
		async click(){
			if(loading || fieldset.sending()) return false;
			
			if(!button.click) throw Error(`Button '${name}' has no action`);
			
			set_loading(true);
			try{
				return await send(_=>button.click.call(fieldset, o));
			}
			finally{
				set_loading(false);
			}
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
	
	function set_loading(bool){
		input.classList.toggle('loading', !!bool);
		
		const fields = fieldset.fields();
		if(fields) fields.forEach(field=>{
			if(![TYPE_HIDDEN,TYPE_BLIND].includes(field.type)) field.Field.readonly(bool);
		});
			
		loading = !!bool;
	}
	
	return Object.freeze(o);
}

/*export function Fieldset(fields, buttons={}){
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

function render_css(css){
	if(!css) return '';
	
	const list = [], classes = to_array(css.class), styles = to_array(css.style);
	if(classes.length) list.push(`class="${classes.join(' ')}"`);
	if(styles.length) list.push(`style="${styles.join('; ')}"`);
	return list.join(' ');
}

function to_array(v){
	if(v == null) return [];
	return Array.isArray(v) ? v : [v];
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

function set_field_error(id, msg){
	const elm = document.getElementById(field_error_id(id));
	if(elm){
		elm.innerHTML = fmt.html(msg);
		elm.style.display = 'block';
	}
}

function clear_field_error(id){
	const elm = document.getElementById(field_error_id(id));
	if(elm){
		elm.style.display = 'none';
		elm.innerHTML = '';
	}
}

function field_error_id(id){
	return id+'_error';
}