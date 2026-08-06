export function create(){
	const data = {}, listeners = {}, o = {
		subscribe(table, callback){
			(listeners[table] ||= new Set()).add(callback);
			
			return function unsubscribe(){
				const set = listeners[table];
				if(!set) return;
				
				set.delete(callback);
				if(!set.size) delete listeners[table];
			};
		},
		put(table, entry){
			(data[table] ||= new Map()).set(entry.id, entry);
			notify(table);
		},
		delete(table, id){
			if(data[table]){
				data[table].delete(id);
				notify(table);
			}
		},
		replace(table, entries){
			data[table] = new Map(
				(entries || []).map(entry=>[entry.id, entry])
			);
			notify(table);
		},
		clear(){
			for(const table of Object.keys(data)){
				data[table] = new Map();
				notify(table);
			}
		}
	};
	
	function notify(table){
		const set = listeners[table];
		if(!set) return;
		
		const values = Array.from(data[table]?.values() || []);
		for(const callback of [...set]) callback(values);
	}
	
	return Object.freeze(o);
}