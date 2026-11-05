export function host(handlers){
	let host = null;
	const o = {
		mount(parent){
			host = parent;
			console.log('mount:', host)
			//handlers.mount();
			//return o;
		},
		activate(bool){
			handlers.activate(bool);
			//return o;
		}/*,
		buttons_html(html){
			host.buttons_html(html);
		}*/
	};
	return Object.freeze(o);
}