import * as dom from 'dom';
import * as frm from 'frm';

const stack = [], type_dialog = 'dialog', type_error = 'error';

let container = null, modal_backdrop = null, modal_stack = null;

export function init(elm){
	const backdrop_id = dom.id(), stack_id = dom.id();
	elm.innerHTML = `
		<div id="${backdrop_id}" class="modal-backdrop"></div>
		<div id="${stack_id}" class="modal-stack"></div>
	`;
	container = elm;
	modal_backdrop = document.getElementById(backdrop_id);
	modal_stack = document.getElementById(stack_id);
}

export function dialog(store, options){
	return open(store, type_dialog, options);
}

export function error(store, options){
	return open(store, type_error, options);
}

function open(store, type, options){
	const modal = create_modal(store, type, options);
	
	stack.at(-1)?.activate(false);
	stack.push(modal);
	modal.activate();
	
	set_backdrop();
	
	return {
		close(){
			close(modal);
		}
	};
}

function close(modal){
	if(stack.at(-1) !== modal) return;
	
	stack.pop();
	stack.at(-1)?.activate();
	modal.remove();
	
	set_backdrop();
}

function create_modal(store, type, options){
	const elm = document.createElement('div');
	elm.className = 'modal';
	modal_stack.append(elm);
	
	const fieldset = frm.fieldset(store, options.fields || null);
	
	return {
		activate(bool=true){
			fieldset.activate(!!bool);
		},
		remove(){
			elm.remove();
		}
	};
}

function set_backdrop(){
	modal_backdrop.style.display = stack.length ? 'block' : 'none';
}