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
		const link = e.target.closest('a'), href = link?.getAttribute('href');
		if(href?.startsWith('/') && !link.target){
			e.preventDefault();
			go(href);
		}
	});
	
	return {
		init: _handle
	};
}

export const controller = (_=>{
	let container = null, subscription = null, cleanup = null, o = {
		init(element){
			container = element;
		},
		render(store, view){
			o.clear();
			subscription = store.subscribe(_=>{
				view(container);
			});
			view(container);
		},
		clear(){
			if(subscription){
				subscription();
				subscription = null;
			}
			if(cleanup){
				cleanup();
				cleanup = null;
			}
		},
		cleanup(fn){
			cleanup = fn;
		}
	};
	return o;
})();