let _handle = null;

export function go(path, force=false){
	const same = window.location.pathname === path;
	if(!force && same) return;
	if(!same) window.history.pushState({}, null, path);
	_handle?.();
}

export function create_router(handler){
	_handle = _=>handler(window.location.pathname);
	
	window.onpopstate = _handle;
	
	document.addEventListener('click', e=>{
		if(e.ctrlKey || e.metaKey || e.shiftKey) return;
		
		const link = e.target.closest('a');
		if(!link || link.target || link.hasAttribute('download')) return;
		
		const href = link.getAttribute('href');
		if(!href?.startsWith('/') || href.startsWith('//')) return;
		
		e.preventDefault();
		go(href);
	});
	
	return {
		init: _handle
	};
}

export const controller = (_=>{
	let container = null, subscription = null, cleanup = null, abort = null;
	const o = {
		init(elm){
			container = elm;
		},
		render(store, view){
			o.clear();
			
			subscription = store.subscribe(render_view);
			render_view();
			
			function render_view(){
				clear_view();
				
				abort = new AbortController();
				view(container, abort.signal);
			}
		},
		clear(){
			subscription?.();
			subscription = null;
			
			clear_view();
		},
		cleanup(fn){
			cleanup = fn;
		}
	};
	
	function clear_view(){
		abort?.abort();
		abort = null;
		
		const fn = cleanup;
		cleanup = null;
		fn?.();
	}
	
	return o;
})();