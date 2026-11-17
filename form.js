import * as frm_types from 'frm_types';
import * as frm_map from 'frm_map';
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
	TYPE_MAP = 'map',
	
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

const EVENT_INPUT='input', EVENT_CHANGE='change', CLASS_ERROR='error', BTN_CTA_NAMES=[BTN_ACTION,BTN_NEXT,BTN_PUT];

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

export function fields_val_reset(fields){
	const data = {};
	for(const [name, field] of fields) data[name] = field?.value ?? '';
	return data;
}

export function fieldset(store, fields, buttons, model_input=null, internal=null){
	let active = true, has_error = false, sending = false;
	
	const model_schema = model_input ? store.schema.get(model_input.type, model_input.name) : null;
	if(model_input && !model_schema) throw Error(`Model input '${model_input.type}.${model_input.name}' does not exist`);
	
	const field_names = Object.create(null), tabs = internal?.tabs ?? create_tabs(), o = {
		store,
		active(){
			return active;
		},
		activate(bool=true){
			active = !!bool;
			return o;
		},
		readonly(bool){
			fields?.forEach(field=>field.Field?.readonly(bool));
			return o;
		},
		sending(){
			return sending;
		},
		has_error(){
			return has_error;
		},
		fields(name){
			if(!arguments.length) return fields;
			valid_field_name(name);
			return fields.get(name);
		},
		buttons(name, gracefully=false){
			if(internal) return arguments.length ? internal.parent.buttons(name, gracefully) : internal.parent.buttons();
			
			if(!arguments.length) return buttons;
			if(gracefully) return buttons[name] || null;
			valid_button_name(name);
			return buttons[name];
		},
		html: Object.freeze({
			field(name, label=null, width=null){
				const id = prepare_field_id(name);
				return `
					<div class="field-container ${label ? 'field-label' : ''}" style="width:${width ? width+'px' : '100%'}">
						${label ? `<label>${fmt.html(label)}</label>` : ''}
						<div id="${id}" class="${label ? 'field-input' : ''}"></div>
						<div id="${field_error_id(id)}" class="field-error"></div>
					</div>
				`;
			},
			field_inline(name, label, width){
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
			map(name, layout){
				const field = o.fields(name);
				if(field.type !== TYPE_MAP) throw Error(`Field '${name}' is not a map`);
				field.layout = layout;
				return o.html.field(name);
			},
			button(name){
				return `<div id="${prepare_button_id(name)}"></div>`;
			},
			buttons(){
				return Object.keys(o.buttons()).map(button=>
					o.html.button(button)
				).join('');
			},
		}),
		apply_button(name, button){
			button = deep_clone(button);
			apply_button(name, button);
			buttons[name] = button;
			return o;
		},
		move_button_last(name){
			if(name in buttons){
				const button = buttons[name];
				delete buttons[name];
				buttons[name] = button;
			}
			return o;
		},
		input_handlers(handlers){
			for(const [name, handler] of Object.entries(handlers)){
				valid_field_name(name);
				fields.get(name).input_handler = handler;
			}
			return o;
		},
		change_handlers(handlers){
			for(const [name, handler] of Object.entries(handlers)){
				valid_field_name(name);
				fields.get(name).change_handler = handler;
			}
			return o;
		},
		render(values={}, format={}, parse_types={}){
			o.render_fields(values, format, parse_types);
			return o.render_buttons();
		},
		render_fields(values={}, format={}, parse_types={}, init=true){
			fields?.forEach((field, name)=>{
				field.format = format[name] ?? null;
				field.parse_types = parse_types[name] ?? null;
				if(![TYPE_HIDDEN,TYPE_BLIND].includes(field.type)) prepare_field(name, values[name]).render();
			});
			if(init) o.init_handlers();
			return o;
		},
		render_buttons(){
			if(!Object.keys(buttons).length) throw Error('Fieldset must have at least one button');
			
			for(const k in buttons) prepare_button(k).render();
			return o;
		},
		init_handlers(){
			fields?.forEach(field=>field.Field?.init_handlers());
			return o;
		},
		tab(tabindex, e){
			tabs.tab(tabindex, e);
		},
		val(name, value){
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
				if(arguments.length === 1) return get_input_value(name);
				
				if(value !== undefined){
					const field = fields.get(name);
					switch(field.type){
					case TYPE_BLIND:
						break;
						
					case TYPE_HIDDEN:
						field.value = value;
						break;
						
					default:
						field.Field.val(value);
					}
				}
				return o;
			}
		},
		val_types(){
			const data = o.val(), error = {};
			if(data === null) return null;
			
			for(const k in data){
				const field = fields.get(k);
				
				if(field.type === TYPE_MAP){
					try{
						data[k] = field.Field.val_types();
					}
					catch(err){
						if(
							!(err instanceof api.HTTP_error) ||
							err.status !== 422 ||
							err.body?.source !== frm_types.SOURCE
						){
							throw err;
						}
						
						error[k] = err.body.error;
					}
					
					continue;
				}
				
				if(!field.Field?.enabled()){
					data[k] = null;
					continue;
				}
				
				if(field.type === TYPE_DROPDOWN && !field.Dropdown?.select() && data[k] === ''){
					data[k] = null;
					continue;
				}
				
				if(field.parse_types){
					const value = field.parse_types(data[k]);
					if(value === null){
						error[k] = frm_types.ERROR_PARSE;
						continue;
					}
					data[k] = value;
				}
				
				const result = model_schema ? frm_types.convert(model_schema, k, data[k]) : {value: data[k]};
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
		error(err, focus=true){
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
						if(field.type === TYPE_MAP){
							if(field.Field.error(error[name] ?? {}, convert_error)) has_error = true;
							return;
						}
						
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
					if(has_error && focus) o.focus();
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
			if(!has_error) return;
			
			has_error = false;
			fields.forEach(field=>{
				if(field.type === TYPE_MAP){
					field.Field?.clear_error();
					return;
				}
				
				field.Field?.input()?.classList.remove(CLASS_ERROR);
				clear_field_error(field.id);
			});
			return o;
		},
		focus(){
			if(fields === null){
				focus_button();
				return o;
			}
			if(has_error){
				for(const [_, field] of fields){
					if(field.type === TYPE_MAP){
						if(field.Field?.has_error()){
							field.Field.focus();
							break;
						}
						
						continue;
					}
					
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
	
	buttons = deep_clone(buttons ?? {});
	for(const k in buttons) apply_button(k, buttons[k]);
	
	async function send(run){
		if(sending) return false;
		
		sending = true;
		o.clear_error();
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
			
		case frm_types.ERROR_PARSE:
			return store.t_error('DATA_TYPE_PARSE');
			
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
				if(field.dropdown) field.type = TYPE_DROPDOWN;
				else if(field.dropdown_calendar){
					field.type = TYPE_DROPDOWN;
					field.dropdown = {
						calendar: true,
						label: field.dropdown_calendar
					};
					delete field.dropdown_calendar;
				}
				if(![TYPE_HIDDEN,TYPE_MAP].includes(field.type)) field.tabindex = tabs.tabindex();
				field.css = create_css(field.css);
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
		
		const field = fields.get(name);
		
		if(field.type === TYPE_MAP){
			if(value !== undefined) field.value = value;
			
			field.Field = frm_map.create(
				field,
				(child_fields, child_model)=>fieldset(
					store,
					child_fields,
					{},
					child_model,
					{
						parent: o,
						tabs
					}
				),
				summary=>{
					const index = tabs.tabindex();
					
					tabs.field(index, {
						input(){
							return summary;
						},
						enabled(visible=false){
							return !visible || !!elm_visible(summary);
						},
						focus(){
							summary.focus();
						}
					});
					
					summary.addEventListener('keydown', e=>{
						if(e.key !== KEY_TAB) return;

						e.preventDefault();
						tabs.tab(index, e);
					});
				}
			);
			
			return field.Field;
		}
		
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
		for(const button of Object.values(buttons)){
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
		button.css = create_css(button.css);
	}
	
	return Object.freeze(o);
}

function create_field(fieldset, name, value, model_input, set_tabindex_field){
	let input = null, rendered = false, dropdown_val = null, current_input_value = null, current_change_value = null;
	const field = fieldset.fields(name), o = {
		render(){
			if(rendered) throw Error(`Field '${name}' is already rendered`);
			
			rendered = true;
			const elm = document.getElementById(field.id), input_id = dom.id();
			if(!elm) throw Error(`Field '${name}' is not found in DOM`);
			
			const label = elm.parentElement?.querySelector('label');
			if(label) label.htmlFor = input_id;
			
			if(field.ralign) field.css.class('text-right');
			
			const value = field.value != null && field.format ? field.format(field.value) : field.value;
			
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
						<input id="${input_id}" type="${TYPE_CHECKBOX}" ${value ? 'checked' : ''}>
						<div id="${checkbox_inner_id}" class="input-checkbox-inner"></div>
					</div>
				`;
				break;
				
			case TYPE_DROPDOWN:
				const d = frm_dropdown.create(fieldset.store, o, field.value, field.format);
				field.Dropdown = d.api
					.render(elm, input_id)
					.definition(field.dropdown);
				dropdown_val = d.input_val;
				break;
				
			default:
				const maxlength = input_maxlength();
				elm.innerHTML = `<input id="${input_id}" ${field.css.render()} type="${field.type || 'text'}" autocomplete="nope" ${maxlength ? `maxlength="${maxlength}"` : ''} value="${fmt.html(value ?? '')}">`;
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
					const btn_cancel = fieldset.buttons(BTN_CANCEL, true);
					if(btn_cancel) await button_click(btn_cancel);
					break;
					
				case KEY_ENTER:
					if(field.type !== TYPE_TEXTAREA || e.ctrlKey || e.metaKey){
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
				if(current_input_value !== value) value_input_trigger(value, false);
			});
			
			input.addEventListener(EVENT_CHANGE, _=>{
				const value = o.val();
				if(current_change_value !== value) value_change_trigger(value, false);
			});
			
			if(field.type === TYPE_CHECKBOX) init_checkbox(checkbox_id, checkbox_inner_id);
			
			return o;
		},
		init_handlers(){
			if(![TYPE_HIDDEN,TYPE_BLIND].includes(field.type)){
				value_input_trigger(o.val(), true);
				value_change_trigger(o.val(), true);
			}
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
				case TYPE_CHECKBOX:
					return !!input.checked;
					
				case TYPE_DROPDOWN:
					return dropdown_val();
					
				default:
					return input.value;
				}
			}
			
			if(value !== undefined){
				if(value !== null && field.format) value = field.format(value);
				
				switch(field.type){
				case TYPE_CHECKBOX:
					input.checked = !!value;
					break;
					
				case TYPE_DROPDOWN:
					dropdown_val(value);
					break;
					
				default:
					input.value = value ?? '';
				}
				
				for(const type of [EVENT_INPUT, EVENT_CHANGE]){
					const event = new Event(type);
					event.programmatic = true;
					input.dispatchEvent(event);
				}
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
		if(!button?.Button) return false;
		
		await button.Button.click();
		return true;
	}
	
	function value_input_trigger(value, init){
		current_input_value = value;
		if(field.type === TYPE_DROPDOWN && model_input && field.Dropdown?.select()) dropdown_select_unsets();
		if(o.enabled()) field.input_handler?.call(fieldset, value, init);
	}
	
	function value_change_trigger(value, init){
		current_change_value = value;
		if(o.enabled()) field.change_handler?.call(fieldset, value, init);
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
	let icon = '', text = '', input = null, loading = false;
	const button = fieldset.buttons(name), o = {
		render(){
			const elm = document.getElementById(button.id), input_id = dom.id(), button_css = button.css.copy();
			if(!elm) throw Error(`Button '${name}' is not found in DOM`);
			
			switch(name){
			case BTN_ACTION:
				icon = button.icon || 'check-lg';
				text = fieldset.store.t(button.text || 'BTN_OK');
				button_css.class('btn-cta');
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
				button_css.class('btn-cta');
				break;
				
			case BTN_PUT:
				icon = button.icon || 'check-lg';
				text = fieldset.store.t(button.text || 'BTN_SAVE');
				button_css.class('btn-cta');
				break;
			}
			
			elm.innerHTML = `
				<button id="${input_id}" ${button_css.render()}>
					<i class="bi bi-${icon}"></i>
					${text}
				</button>
			`;
			input = document.getElementById(input_id);
			if(!input) return;
			
			input.addEventListener('click', _=>o.click());
		},
		async click(){
			if(!fieldset.active() || loading || fieldset.sending()) return false;
			
			if(!button.click) throw Error(`Button '${name}' has no action`);
			
			set_loading(true);
			try{
				return await send(_=>button.click.call(fieldset, o));
			}
			finally{
				set_loading(false);
			}
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
	let tabindex = 0;
	const tabs = Object.create(null);
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

function create_css(css={}){
	const classes = to_array(css.class), styles = to_array(css.style), o = {
		copy(){
			return create_css({
				class: [...classes],
				style: [...styles]
			});
		},
		class(...values){
			classes.push(...values);
			return this;
		},
		style(...values){
			styles.push(...values);
			return this;
		},
		render(){
			const list = [];
			if(classes.length) list.push(`class="${classes.join(' ')}"`);
			if(styles.length) list.push(`style="${styles.join('; ')}"`);
			return list.join(' ');
		}
	};
	
	function to_array(v){
		if(v == null) return [];
		return Array.isArray(v) ? v : [v];
	}
	
	return Object.freeze(o);
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
	if(!elm) return false;
	for(let parent = elm.parentElement; parent; parent = parent.parentElement){
		if(parent instanceof HTMLDetailsElement && !parent.open){
			const summary = Array.from(parent.children).find(
				child=>child.tagName === 'SUMMARY'
			);
			if(!summary?.contains(elm)) return false;
		}
	}
	return elm.offsetWidth || elm.offsetHeight || elm.getClientRects().length;
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
	if(!elm) return;
	
	elm.classList.remove('active');
	dom.event_transitionend(elm, function(){
		if(!elm.classList.contains('active')) elm.innerHTML = '';
		this.remove();
	});
}

function field_error_id(id){
	return id+'_error';
}