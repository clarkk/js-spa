import * as fmt from 'fmt';

export function create_auth_store(init_state){
	let current_state = init_state, env_data = null, trans = {}, trans_lang = {}, trans_lang_error = {};
	const listeners = new Set(), o = {
		init_trans(){
			if(Object.keys(trans).length) return;
			trans = window?.__trans__ || {};
			trans_lang = trans.lang || {};
			trans_lang_error = trans.lang_error || {};
			o.update();
		},
		env(data, update=false){
			if(!arguments.length) return {...env_data};
			env_data = {...data};
			if(update) o.update();
		},
		state(state, update=false){
			if(!arguments.length) return current_state;
			current_state = state;
			if(update) o.update();
		},
		t: (key, replace)=>translate(key, trans_lang, replace),
		t_error: (key, replace)=>translate(key, trans_lang_error, replace),
		update(){
			for(const fn of listeners){
				try{
					fn();
				}
				catch(err){
					console.error('Store listener failed:', err);
					
					setTimeout(_=>{
						throw err instanceof Error ? err : new Error(String(err));
					}, 0);
				}
			}
		},
		subscribe(fn){
			listeners.add(fn);
			return _=>listeners.delete(fn);
		}
	};
	
	o.init_trans();
	
	function translate(key, dict, replace){
		const lang = env_data?.lang;
		if(!lang) return fmt.html(key)
		const s = dict[lang]?.[key] || key;
		return fmt.html(trans_replace(s, replace));
	}
	
	function trans_replace(s, replace={}){
		for(const k in replace) s = s.replaceAll(`%${k}%`, replace[k]);
		return s;
	}
	
	return o;
}

export function create_poller(action, seconds, only_visible=false){
	const event = 'visibilitychange';
	let timeout, running = false;
	
	if(only_visible){
		document.addEventListener(event, handle);
		if(!document.hidden) start();
	}
	else start();
	
	async function tick(){
		if(!running) return;
		await action();
		if(running){
			clearTimeout(timeout); 
			timeout = setTimeout(tick, seconds * 1000);
		}
	}
	
	function start(){
		stop();
		running = true;
		tick();
	}
	
	function stop(){
		running = false;
		clearTimeout(timeout);
		timeout = null;
	}
	
	function handle(){
		document.hidden ? stop() : start();
	}
	
	return _=>{
		stop();
		if(only_visible) document.removeEventListener(event, handle);
	};
}