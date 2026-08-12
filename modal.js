import * as dom from 'dom';
import * as frm from 'frm';

const stack = [], type_dialog = 'dialog', type_error = 'error';

let modal_backdrop = null, modal_stack = null;

export function init(container){
	const backdrop_id = dom.id(), stack_id = dom.id();
	container.innerHTML = `
		<div id="${backdrop_id}" class="modal-backdrop"></div>
		<div id="${stack_id}" class="modal-stack"></div>
	`;
	modal_backdrop = document.getElementById(backdrop_id);
	modal_stack = document.getElementById(stack_id);
	window.addEventListener('keydown', handle_keydown);
}

export function dialog(store, content, options={}){
	return open(store, type_dialog, content, options);
}

export function error(store, content, options={}){
	return open(store, type_error, content, options);
}

function open(store, type, content, options){
	const modal = create_modal(store, type, content, options);
	
	top_modal()?.activate(false);
	stack.push(modal);
	modal.activate();
	
	set_backdrop();
	
	return function close(){
		close(modal);
	};
}

function close(modal){
	if(top_modal() !== modal) return;
	
	stack.pop();
	top_modal()?.activate();
	modal.remove();
	
	set_backdrop();
}

function create_modal(store, type, content, options){
	let fieldset = null;
	const content_id = dom.id(), buttons_id = dom.id(), elm = document.createElement('div');
	elm.className = `modal modal-${type}`;
	elm.innerHTML = `
		<div id="${content_id}" class="modal-content"></div>
		<div id="${buttons_id}" class="modal-buttons"></div>
	`;
	modal_stack.append(elm);
	
	const elm_content = document.getElementById(content_id), elm_buttons = document.getElementById(buttons_id), content_api = Object.freeze({
		html(html){
			elm_content.innerHTML = html;
		},
		buttons(fieldset){
			elm_buttons.innerHTML = fieldset.html_buttons();
		}
	});
	
	switch(typeof content){
	case 'string':
		fieldset = frm.fieldset(store, null, {
			[frm.BTN_ACTION]: {
				click(){
					console.log('click modal ok')
					close(modal);
				}
			}
		});
		content_api.html(`<p>${content}</p>`);
		content_api.buttons(fieldset);
		break;
		
	case 'function':
		fieldset = content.call(content_api);
		break;
	}
	
	return Object.freeze({
		activate(bool=true){
			fieldset.activate(!!bool);
		},
		remove(){
			elm.remove();
		}
	});
}

function handle_keydown(e){
	if(e.key !== frm.KEY_ESC || stack.length === 0) return;
	
	const modal = top_modal();
	if(modal) close(modal);
}

function top_modal(){
	return stack.at(-1);
}

function set_backdrop(){
	modal_backdrop.classList.toggle('active', !!stack.length);
}