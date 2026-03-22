import * as fmt from 'fmt';

export const create_auth_store = init_state=>{
	let current_state = init_state, env_data = null, trans = window?.__trans__ || {}, trans_lang = trans.lang || {}, trans_lang_error = trans.lang_error || {};
	const listeners = new Set(), o = {
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
		t: key=>translate(key, trans_lang),
		t_error: key=>translate(key, trans_lang_error),
		update: _=>listeners.forEach(fn=>fn()),
		subscribe(fn){
			listeners.add(fn);
			return _=>listeners.delete(fn);
		}
	};
	
	function translate(key, dict){
		const lang = env_data?.lang;
		if(!lang) return fmt.html(key)
		return fmt.html(dict[lang]?.[key] || key)
	}
	
	return o;
};