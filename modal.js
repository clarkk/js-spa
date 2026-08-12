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

export function dialog(store, options){
	return open(store, type_dialog, options);
}

export function error(store, options){
	return open(store, type_error, options);
}

function open(store, type, options){
	const modal = create_modal(store, type, options);
	
	top_modal()?.activate(false);
	stack.push(modal);
	modal.activate();
	
	set_backdrop();
	
	return close(){
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

function create_modal(store, type, options, callback){
	const elm = document.createElement('div');
	elm.className = `modal modal-${type}`;
	elm.innerHTML = `
		<div class="modal-content">
			test
		</div>
	`;
	
	modal_stack.append(elm);
	
	//const fieldset = frm.fieldset(store, options.fields || null);
	
	return {
		activate(bool=true){
			//fieldset.activate(!!bool);
		},
		remove(){
			elm.remove();
		}
	};
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