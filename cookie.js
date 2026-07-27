export function get(name){
	const prefix = encodeURIComponent(name)+'=';
	for(const cookie of document.cookie.split(';')){
		const value = cookie.trim();
		if(value.startsWith(prefix)){
			try{
				return decodeURIComponent(value.slice(prefix.length)).replace(/^"|"$/g, '');
			}
			catch(err){
				console.error('Unable to decode cookie:', err);
				return null;
			}
		}
	}
	return null;
}

export function get_json(name){
	const value = get(name);
	if(value === null) return null;
	
	try{
		return JSON.parse(value);
	}
	catch(err){
		console.error('Unable to parse cookie:', err);
		return null;
	}
}