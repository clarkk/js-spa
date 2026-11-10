export function calendar(value){
	
}

export function weekdays(locale='da', length=1){
	const formatter = new Intl.DateTimeFormat(locale, {weekday: 'long'});
	return Array.from({length: 7}, (_, i)=>
		formatter.format(new Date(2024, 0, 1 + i)).slice(0, length)
	);
}

function parse(value){
	value = String(value ?? '').trim();
	
	let parts;
	if(/^\d+$/.test(value)){
		if(value.length !== 6 && value.length !== 8) return null;
		parts = [value.slice(0, 2), value.slice(2, 4), value.slice(4)];
	}
	else{
		const match = value.match(/^(\d{2})[-/.](\d{2})[-/.](\d{4})$/);
		if(!match) return null;
		parts = [match[1], match[2], match[3]];
	}
	
	const day = Number(parts[0]), month = Number(parts[1]), year = Number(parts[2]) + (parts[2].length === 2 ? 2000 : 0);
	if(year < 1900 || year > 2100) return null;
	
	const date = new Date(Date.UTC(year, month - 1, day));
	if(date.getUTCFullYear() !== year || date.getUTCMonth() + 1 !== month || date.getUTCDate() !== day) return null;
	
	return {
		year,
		month,
		day
	};
}