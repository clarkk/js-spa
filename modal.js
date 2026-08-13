import * as dom from 'dom';
import * as frm from 'frm';

const stack = [], type_dialog = 'dialog', type_error = 'error';

let app_container = null, modal_backdrop = null, modal_stack = null;

export function init(main, modal_container){
	app_container = main;
	const backdrop_id = dom.id(), stack_id = dom.id();
	modal_container.innerHTML = `
		<div id="${backdrop_id}" class="modal-backdrop"></div>
		<div id="${stack_id}" class="modal-stack"></div>
	`;
	modal_backdrop = document.getElementById(backdrop_id);
	modal_stack = document.getElementById(stack_id);
	window.addEventListener('keydown', handle_keydown);
}

export function dialog(store, content){
	return open(store, type_dialog, content);
}

export function error(store, content){
	return open(store, type_error, content);
}

function open(store, type, content){
	const modal = create_modal(store, type, content);
	
	top_modal()?.activate(false);
	stack.push(modal);
	modal.activate();
	
	set_backdrop();
	
	return function close(){
		modal.close();
	};
}

function create_modal(store, type, content){
	let fieldset = null;
	const title_id = dom.id(), content_id = dom.id(), buttons_id = dom.id(), elm = document.createElement('div');
	elm.className = `modal modal-${type}`;
	elm.innerHTML = `
		<div id="${title_id}" class="modal-title"></div>
		<div id="${content_id}" class="modal-content"></div>
		<div id="${buttons_id}" class="modal-buttons"></div>
	`;
	modal_stack.append(elm);
	
	const elm_title = document.getElementById(title_id), elm_content = document.getElementById(content_id), modal = Object.freeze({
		activate(bool=true){
			fieldset.activate(!!bool);
		},
		title_html(html){
			elm_title.innerHTML = html || '';
		},
		content_html(html){
			elm_content.innerHTML = html || '';
		},
		close(){
			if(top_modal() !== modal) return;
			
			stack.pop();
			top_modal()?.activate();
			elm.remove();
			
			set_backdrop();
		}
	});
	
	switch(typeof content){
	case 'string':
		fieldset = frm.fieldset(store, null, {
			[frm.BTN_ACTION]: {
				click(){
					modal.close();
				}
			}
		});
		modal.title_html(content);
		break;
		
	case 'function':
		fieldset = content.call(modal);
		break;
		
	default: throw Error('Modal content must be a string or function');
	}
	
	document.getElementById(buttons_id).innerHTML = fieldset.html_buttons();
	fieldset.render().focus();
	
	return modal;
}

function handle_keydown(e){
	if(e.key !== frm.KEY_ESC || stack.length === 0) return;
	
	top_modal()?.close();
}

function top_modal(){
	return stack.at(-1);
}

function set_backdrop(){
	const active = !!stack.length;
	modal_backdrop.classList.toggle('active', active);
	app_container.classList.toggle('modal-open', active);
}