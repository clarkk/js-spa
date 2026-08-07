export function create(){
	const data = Object.create(null), cache = Object.create(null), listeners = Object.create(null), o = {
		subscribe(table, callback){
			(listeners[table] ||= new Set()).add(callback);
			
			return function unsubscribe(){
				const set = listeners[table];
				if(!set) return;
				
				set.delete(callback);
				if(!set.size) delete listeners[table];
			};
		},
		get(table){
			return get(table);
		},
		put(table, entry){
			(data[table] ||= new Map()).set(entry.id, Object.freeze(entry));
			delete cache[table];
			notify(table);
		},
		delete(table, id){
			const map = data[table];
			if(!map) return;
			
			if(map.delete(id)){
				delete cache[table];
				notify(table);
			}
		},
		replace(table, entries){
			data[table] = new Map(
				entries.map(entry=>[entry.id, Object.freeze(entry)])
			);
			delete cache[table];
			notify(table);
		},
		clear(){
			for(const table of Object.keys(data)){
				data[table] = new Map();
				delete cache[table];
				notify(table);
			}
		}
	};
	
	function get(table){
		return cache[table] ||= Object.freeze(
			Array.from(data[table]?.values() || [])
		);
	}
	
	function notify(table){
		const set = listeners[table];
		if(!set) return;
		
		const values = get(table);
		for(const callback of [...set]) callback(values);
	}
	
	return Object.freeze(o);
}