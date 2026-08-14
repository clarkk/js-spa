let dom_id = 0, dom_id_prefix = (Math.random() + 1).toString(36).substring(2, 5)

export function id(){
	return 'e'+dom_id_prefix+dom_id++;
}

export function html_before(elm, html, mounted=null){
	elm.insertAdjacentHTML('beforebegin', html);
	if(mounted) for(const fn of mounted) fn();
}

export function html_after(elm, html, mounted=null){
	elm.insertAdjacentHTML('afterend', html);
	if(mounted) for(const fn of mounted) fn();
}

export function html_prepend(elm, html, mounted=null){
	elm.insertAdjacentHTML('afterbegin', html);
	if(mounted) for(const fn of mounted) fn();
}

export function html_append(elm, html, mounted=null){
	elm.insertAdjacentHTML('beforeend', html);
	if(mounted) for(const fn of mounted) fn();
}

export function event_transitionend(elm, handler){
	const event = {
		remove(){
			elm.removeEventListener('transitionend', fn);
		}
	}, fn = handler.bind(event);
	elm.addEventListener('transitionend', fn);
}

/*export function scrollbar_width(elm){
	return elm.offsetWidth - elm.clientWidth;
}

export function scrollbar_body_width(){
	return window.innerWidth - document.documentElement.clientWidth;
}*/