import * as api from 'api';
import * as fmt from 'fmt';

export function create_auth_store(init_state, url_trans, create_extension=null){
	valid_state(init_state);
	
	let current_state = init_state, env_data = null, trans_lang = {}, trans_lang_error = {};
	const listeners = new Set(), schema = create_schema(), o = {
		schema,
		env(data, update=false){
			if(!arguments.length) return {...env_data};
			env_data = {...data};
			if(update) o.update();
		},
		state(state){
			if(!arguments.length) return current_state;
			valid_state(state);
			current_state = state;
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
			return function unsubscribe(){
				listeners.delete(fn);
			};
		}
	};
	
	load_trans(url_trans);
	
	function load_trans(url){
		api.client.get(url).then(trans=>{
			trans_lang = trans?.lang || {};
			trans_lang_error = trans?.lang_error || {};
			o.update();
		}).catch(err=>{
			console.error('Unable to load translations:', err);
		});
	}
	
	function translate(key, dict, replace){
		const lang = env_data?.lang;
		if(!lang) return fmt.html(key);
		const s = dict[lang]?.[key] || key;
		return fmt.html(trans_replace(s, replace));
	}
	
	function trans_replace(s, replace={}){
		for(const k in replace) s = s.replaceAll(`%${k}%`, replace[k]);
		return s;
	}
	
	function valid_state(state){
		if(typeof state !== 'string') throw Error(`State must be a string, got ${typeof state}`);
	}
	
	if(create_extension){
		const extension = create_extension(o);
		if(!extension || typeof extension !== 'object') throw Error('Store extension must return an object');
		for(const key of Object.keys(extension)){
			if(key in o) throw Error('Store extension property already exists: '+key);
		}
		Object.assign(o, extension);
	}
	
	return Object.freeze(o);
}

export function create_poller(action, seconds, only_visible=false, immediate=false){
	const event = 'visibilitychange', delay = seconds * 1000;
	let timeout = null, running = false, run_id = 0, first_start = true;
	
	if(only_visible){
		document.addEventListener(event, handle_visibility);
		if(!document.hidden) start();
	}
	else start();
	
	async function tick(current_run_id){
		if(!running || current_run_id !== run_id) return;
		timeout = null;
		try{
			await action();
		}
		catch(err){
			console.error('Poller action failed:', err);
		}
		if(running && current_run_id === run_id && (!only_visible || !document.hidden)){
			timeout = setTimeout(_=>tick(current_run_id), delay);
		}
	}
	
	function start(){
		if(running) return;
		running = true;
		const current_run_id = ++run_id;
		if(first_start){
			first_start = false;
			if(immediate) tick(current_run_id);
			else timeout = setTimeout(_=>tick(current_run_id), delay);
		}
		else tick(current_run_id);
	}
	
	function stop(){
		running = false;
		run_id++;
		clearTimeout(timeout);
		timeout = null;
	}
	
	function handle_visibility(){
		if(document.hidden) stop();
		else start();
	}
	
	return function destroy(){
		stop();
		if(only_visible) document.removeEventListener(event, handle_visibility);
	};
}

export function deep_freeze(obj){
	if(!obj || typeof obj !== 'object') return obj;
	for(const value of Object.values(obj)) deep_freeze(value);
	return Object.freeze(obj);
}

function create_schema(){
	const data = {
		db: {},
		table: {},
		table_resources: {},
		action: {},
		query: {}
	};
	return Object.freeze({
		load(update){
			data.db = deep_freeze(update.db || {});
			data.table = deep_freeze(update.table || {});
			data.table_resources = deep_freeze(update.table_resources || {});
			data.action = deep_freeze(update.action || {});
			data.query = deep_freeze(update.query || {});
		},
		get(type, name){
			return data[type]?.[name] ?? null;
		},
		get_db_column(table, column){
			return data.db[table]?.[column] ?? null;
		},
		table_resource(name){
			return data.table_resources[name] ?? null;
		}
	});
}