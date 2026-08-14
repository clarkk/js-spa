import * as dom from 'dom';

let container;

const type_success = 'success', type_warning = 'warning', type_error = 'error', type_info = 'info', types = {
	[type_success]: {
		icon: 'check-circle'
	},
	[type_warning]: {
		icon: 'exclamation-triangle'
	},
	[type_error]: {
		icon: 'x-circle'
	},
	[type_info]: {
		icon: 'info-circle'
	}
};

export function init(elm){
	container = elm;
}

export function success(message, duration=3000){
	return show(message, type_success, duration);
}

export function warning(message, duration=6000){
	return show(message, type_warning, duration);
}

export function error(message, duration=8000){
	return show(message, type_error, duration);
}

export function info(message, duration=4000){
	return show(message, type_info, duration);
}

function show(message, type, duration){
	if(!container) return null;
	
	const elm = document.createElement('div'), icon = document.createElement('i'), text = document.createElement('div');
	
	elm.className = `toast toast-${type}`;
	icon.className = `bi bi-${types[type].icon}`;
	text.textContent = message;
	
	elm.append(icon, text);
	container.append(elm);
	
	elm.onclick = close;
	
	requestAnimationFrame(_=>{
		elm.classList.add('toast-show');
	});
	
	let timeout = setTimeout(close, duration), closing = false;
	
	function close(){
		if(closing) return;
		
		closing = true;
		clearTimeout(timeout);
		
		dom.event_transitionend(elm, function(){
			elm.remove();
			this.remove();
		});
		
		elm.classList.remove('toast-show');
	}
	
	return {
		close
	};
}