import * as frm_types from 'frm_types';
import * as frm_dropdown from 'frm_dropdown';
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
	
	DROPDOWN_CALENDAR = 'calendar',
	
	BTN_ACTION = 'action',
	BTN_BACK = 'back',
	BTN_CANCEL = 'cancel',
	BTN_NEXT = 'next',
	BTN_PUT = 'put',
	
	KEY_TAB = 'Tab',
	KEY_ESC = 'Escape',
	KEY_ENTER = 'Enter',
	KEY_ARROW_DOWN = 'ArrowDown',
	KEY_ARROW_UP = 'ArrowUp';

const EVENT_INPUT='input',
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
	
	const model_schema = model_input ? store.schema.get(model_input.type, model_input.name) : null;
	if(model_input && !model_schema) throw Error(`Model input '${model_input.type}.${model_input.name}' does not exist`);
	
	const field_names = Object.create(null), tabs = create_tabs(), o = {
		store,
		sending(){
			return sending;
		},
		fields(name){
			if(!arguments.length) return fields;
			valid_field_name(name);
			return fields.get(name);
		},
		buttons(name){
			if(!arguments.length) return buttons;
			valid_button_name(name);
			return buttons[name];
		},
		html_field(name, label=null, width=null){
			const id = prepare_field_id(name);
			return `
				<div class="field-container ${label ? 'field-label' : ''}" style="width:${width ? width+'px' : '100%'}">
					${label ? `<label>${fmt.html(label)}</label>` : ''}
					<div id="${id}" class="${label ? 'field-input' : ''}"></div>
					${fields.get(name).type === TYPE_DROPDOWN ? '' : `<div id="${field_error_id(id)}" class="field-error"></div>`}
				</div>
			`;
		},
		html_field_inline(name, label, width){
			const id = prepare_field_id(name);
			return `
				<div class="field-container field-label-inline">
					${fields.get(name).type === TYPE_CHECKBOX ? `
						<label>${fmt.html(label)}</label>
						<div id="${id}" class="field-input"></div>
					` : `
						
					`}
				</div>
			`;
		},
		html_button(name){
			return `<div id="${prepare_button_id(name)}"></div>`;
		},
		render(values={}){
			o.render_fields(values);
			o.render_buttons();
			return o;
		},
		render_fields(values={}){
			fields?.forEach((field, name)=>{
				if(![TYPE_HIDDEN,TYPE_BLIND].includes(field.type)) prepare_field(name, values[name]).render();
			});
			fields?.forEach(field=>field.Field?.apply_handler());
			return o;
		},
		render_buttons(){
			for(const k in buttons) prepare_button(k).render();
			return o;
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
		val_types(){
			const data = o.val(), error = {};
			if(data === null) return null;
			
			for(const k in data){
				const field = fields.get(k);
				if(!field.Field?.enabled()){
					data[k] = null;
					continue;
				}
				
				if(field.type === TYPE_DROPDOWN && !field.Dropdown?.select() && data[k] === ''){
					data[k] = null;
					continue;
				}
				
				const result = frm_types.convert(model_schema, k, data[k]);
				if(result.error) error[k] = result.error;
				else data[k] = result.value;
			}
			if(Object.keys(error).length){
				throw new api.HTTP_error(422, {
					error,
					source: frm_types.SOURCE
				});
			}
			return data;
		},
		error(err){
			switch(true){
			case err instanceof api.HTTP_error:
				has_error = false;
				switch(err.status){
				case 400:
				case 422:
					const error = err.body?.error ?? {}, convert_error = err.body?.source === frm_types.SOURCE;
					if(error.request){
						console.error(`HTTP ${err.status}:`, err);
						return true;
					}
					fields.forEach((field, name)=>{
						const input = field.Field?.input();
						if(!input) return;
						
						let input_error = error[name] || null;
						input.classList.toggle(CLASS_ERROR, !!input_error);
						if(input_error){
							if(field.type !== TYPE_CHECKBOX){
								if(convert_error) input_error = convert_error_message(input_error);
								set_field_error(field.id, input_error);
							}
							has_error = true;
						}
						else clear_field_error(field.id);
					});
					if(has_error) o.focus();
					return true;
				
				case 404:
					console.error(`HTTP ${err.status}:`, err);
					return true;
				
				case 500:
				case 502:
				case 503:
					console.error(`HTTP ${err.status}:`, err);
					return true;
				}
				break;
			
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
				for(const [_, field] of fields){
					if(field.Field?.enabled(true) && field.Field.input().classList.contains(CLASS_ERROR)){
						field.Field.focus();
						break;
					}
				}
			}
			else{
				let found = false;
				for(const [_, field] of fields){
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
		},
		disable(name, bool=true, keep_value=false){
			valid_field_name(name);
			const f = fields.get(name).Field;
			f.disable(bool, keep_value);
			return f;
		},
		reset(values={}){
			fields.forEach((field, name)=>{
				if(field.Field?.enabled()){
					if(values[name] !== undefined) field.Field.val(values[name]);
					else field.Field.reset();
				}
			});
			return o;
		}
	};
	
	apply_fields(fields);
	
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
	
	function convert_error_message(code){
		switch(code){
		case frm_types.ERROR_NULL:
			return store.t_error('DATA_TYPE_NULL');
			
		case frm_types.ERROR_STRING:
			return store.t_error('DATA_TYPE_STRING');
			
		case frm_types.ERROR_DECIMAL:
			return store.t_error('DATA_TYPE_DECIMAL');
			
		case frm_types.ERROR_INT32:
		case frm_types.ERROR_INT64:
			return store.t_error('DATA_TYPE_INTEGER');
			
		case frm_types.ERROR_UINT32:
		case frm_types.ERROR_UINT64:
			return store.t_error('DATA_TYPE_UNSIGNED_INTEGER');
			
		case frm_types.ERROR_BOOL:
			return store.t_error('DATA_TYPE_BOOLEAN');
			
		default:
			throw Error(`Unsupported convert error '${code}'`);
		}
	}
	
	function apply_fields(apply_fields){
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
	}
	
	function prepare_field_id(name){
		valid_field_name(name);
		return fields.get(name).id;
	}
	
	function prepare_button_id(name){
		valid_button_name(name);
		return buttons[name].id;
	}
	
	function prepare_field(name, value){
		valid_field_name(name);
		return create_field(o, name, value, model_input, set_tabindex_field);
	}
	
	function prepare_button(name){
		valid_button_name(name);
		return create_button(o, name, send);
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
		const field = fields.get(name);
		switch(field.type){
		case TYPE_BLIND:
			return null;
			
		case TYPE_HIDDEN:
			return field.value;
			
		default:
			return field.Field.val();
		}
	}
	
	function focus_button(){
		for(const button of buttons){
			if(button.focus){
				button.Button.focus();
				return;
			}
		}
		for(const key of BTN_CTA_NAMES){
			const button = buttons[key];
			if(button){
				button.Button.focus();
				return;
			}
		}
	}
	
	function set_tabindex_field(tabindex, Field){
		tabs.field(tabindex, Field);
	}
	
	function apply_button(name, button){
		button.id = dom.id();
		
		if(!button.css) button.css = {style: [], class: []};
	}
	
	return Object.freeze(o);
}

function create_field(fieldset, name, value, model_input, set_tabindex_field){
	let input = null, rendered = false, dropdown_val = null, current_value = null;
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
			case TYPE_BLIND:
				throw Error(`Field '${name}' is blind and can not be rendered`);
				
			case TYPE_HIDDEN:
				throw Error(`Field '${name}' is hidden and can not be rendered`);
				
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
				const d = frm_dropdown.create(fieldset.store, o, field.value);
				field.Dropdown = d.api
					.render(elm, input_id)
					.definition(field.dropdown);
				dropdown_val = d.input_val;
				break;
				
			default:
				const maxlength = input_maxlength();
				elm.innerHTML = `<input id="${input_id}" ${render_css(field.css)} type="${field.type || 'text'}" autocomplete="nope" ${maxlength ? `maxlength="${maxlength}"` : ''} value="${fmt.html(field.value ?? '')}">`;
			}
			
			input = document.getElementById(input_id);
			if(!input) return;
			
			input.addEventListener('keydown', async e=>{
				if(input.disabled || field.Dropdown?.keydown(e)) return;
				
				switch(e.key){
				case KEY_TAB:
					e.preventDefault();
					o.tab(e);
					break;
					
				case KEY_ESC:
					e.preventDefault();
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
				
				const value = o.val();
				if(current_value !== value) value_change(value, false);
			});
			
			if(field.type === TYPE_CHECKBOX) init_checkbox(checkbox_id, checkbox_inner_id);
			
			return o;
		},
		apply_handler(){
			if(![TYPE_HIDDEN,TYPE_BLIND].includes(field.type)) value_change(o.val(), true);
		},
		tab(e){
			fieldset.tab(field.tabindex, e);
		},
		focus(no_selection=false){
			if(input){
				if(no_selection || input.readOnly) input.focus();
				else{
					input.select();
					input.focus();
				}
			}
			return o;
		},
		readonly(bool=true){
			if(o.enabled() && !field.Dropdown?.select()) input.readOnly = !!bool;
			return o;
		},
		disable(bool=true, keep_value=false){
			if(input && input.disabled !== !!bool){
				if(bool && has_focus()) o.tab();
				input.disabled = !!bool;
				if(bool && !keep_value && !field.Dropdown?.select()) o.val('');
			}
			return o;
		},
		enabled(visible=false){
			if(!input || input.disabled) return false;
			return visible && !elm_visible(input) ? false : true;
		},
		val(value){
			if(!arguments.length){
				switch(field.type){
				case TYPE_HIDDEN:
					return field.value;
					
				case TYPE_CHECKBOX:
					return !!input.checked;
					
				case TYPE_DROPDOWN:
					return dropdown_val();
					
				default:
					return input.value;
				}
			}
			
			if(value !== undefined){
				switch(field.type){
				case TYPE_HIDDEN:
					field.value = value;
					break;
					
				case TYPE_CHECKBOX:
					input.checked = !!value;
					break;
					
				case TYPE_DROPDOWN:
					dropdown_val(value);
					break;
					
				default:
					input.value = value ?? '';
				}
				
				if(input) input.dispatchEvent(new Event(EVENT_INPUT));
			}
			return o;
		},
		reset(){
			o.val(field.value);
			return o;
		},
		input(){
			return input;
		}
	};
	
	field.Field = o;
	if(value !== undefined) field.value = value;
	if('tabindex' in field) set_tabindex_field(field.tabindex, o);
	
	async function button_click(button){
		if(!button?.Button || button.Button.hidden()) return false;
		
		await button.Button.click();
		return false;
	}
	
	function value_change(value, init){
		if(field.type === TYPE_DROPDOWN && model_input && field.Dropdown?.select()) dropdown_select_unsets();
		if(o.enabled()){
			field.handler?.call(fieldset, value, init);
			current_value = value;
		}
	}
	
	function dropdown_select_unsets(){
		const stack = [];
		apply(name);
		
		function apply(name){
			const index = stack.indexOf(name);
			if(index !== -1){
				const cycle = [...stack.slice(index), name].join(' -> ');
				throw Error(`Circular unset dependency: ${cycle}`);
			}
			
			stack.push(name);
			
			const rules = fieldset.store.schema.enum_unsets(model_input.type, model_input.name, name);
			if(rules){
				const source = fieldset.fields(name), value = source.Field.val();
				for(const [target_name, rule] of Object.entries(rules)){
					const target = fieldset.fields(target_name), disabled = rule.values.includes(value) === rule.in;
					target.Field.disable(disabled);
					apply(target_name);
				}
			}
			
			stack.pop();
		}
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
		
		let resource = fieldset.store.schema.table_resource(model_input.name);
		if(!resource) throw Error(`Table resource '${model_input.name}' does not exist`);
		
		if(!Array.isArray(resource)) resource = [resource];
		for(const table of resource){
			const column = fieldset.store.schema.db_column(table, name);
			if(column) return column.length || null;
		}
		
		throw Error(`DB schema '${model_input.name}.${name}' does not exist`);
	}
	
	function has_focus(){
		return input && document.activeElement === input;
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
			
			elm.innerHTML = `<button id="${input_id}" ${render_css(button.css)}>
				<i class="bi bi-${icon}"></i>
				${text}
			</button>`;
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
		const b = !!bool;
		input.classList.toggle('loading', b);
		
		const fields = fieldset.fields();
		if(fields) fields.forEach(field=>{
			if(![TYPE_HIDDEN,TYPE_BLIND].includes(field.type)){
				field.Field.readonly(b);
				field.Field.input().classList.toggle('sending', b);
			}
		});
		
		loading = b;
	}
	
	return Object.freeze(o);
}

function create_tabs(){
	let tabindex = 0, tabs = Object.create(null);
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
		elm.classList.add('active');
	}
}

function clear_field_error(id){
	const elm = document.getElementById(field_error_id(id));
	if(elm){
		elm.classList.remove('active');
		elm.innerHTML = '';
	}
}

function field_error_id(id){
	return id+'_error';
}