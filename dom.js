let dom_id = 0, dom_id_prefix = (Math.random() + 1).toString(36).substring(2, 5)

export function id(){
	return 'e'+dom_id_prefix+dom_id++;
}

/*export function scrollbar_width(elm){
	return elm.offsetWidth - elm.clientWidth;
}

export function scrollbar_body_width(){
	return window.innerWidth - document.documentElement.clientWidth;
}*/