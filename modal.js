import * as dom from 'dom';

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

export function dialog(options){
	return open(type_dialog, options);
}

export function error(options){
	return open(type_error, options);
}

function open(type, options){
	const modal = create_modal(type, options);
	stack.push(modal);
	set_backdrop();
	return {
		close(){
			close(modal);
		}
	};
}

function close(modal){
	const i = stack.indexOf(modal);
	if(i !== -1) stack.splice(i, 1);
	set_backdrop();
}

function create_modal(type, options){
	const elm = document.createElement('div');
	elm.className = 'modal';
	modal_stack.append(elm);
	return {
		elm
	};
}

function set_backdrop(){
	modal_backdrop.style.display = stack.length ? 'block' : 'none';
}