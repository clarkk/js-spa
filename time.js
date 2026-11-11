export function calendar(value){
	const parsed = parse_date(value), today = new Date();
	today.setTime(Date.UTC(today.getFullYear(), today.getMonth(), today.getDate()));
	
	const date = parsed ? new Date(Date.UTC(parsed.year, parsed.month - 1, parsed.day)) : today, o = {
		get(){
			return {
				year: date.getUTCFullYear(),
				month: date.getUTCMonth() + 1,
				day: date.getUTCDate(),
				weeks: month_weeks(date)
			};
		},
		update(offset){
			const day = date.getUTCDate();
			date.setUTCDate(1);
			date.setUTCMonth(date.getUTCMonth() + offset);
			
			const last_day = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + 1, 0)).getUTCDate();
			date.setUTCDate(Math.min(day, last_day));
			
			return o.get();
		}
	};
	return o;
}

export function weekdays(locale='da', length=1){
	const formatter = new Intl.DateTimeFormat(locale, {weekday: 'long'});
	return Array.from({length: 7}, (_, i)=>
		formatter.format(new Date(2024, 0, 1 + i)).slice(0, length)
	);
}

function parse_date(value){
	value = String(value ?? '').trim();
	
	let parts;
	if(/^\d+$/.test(value)){
		if(value.length !== 6 && value.length !== 8) return null;
		parts = [value.slice(0, 2), value.slice(2, 4), value.slice(4)];
	}
	else{
		const match = value.match(/^(\d{2})([-/.])(\d{2})\2(\d{4})$/);
		if(!match) return null;
		parts = [match[1], match[3], match[4]];
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

function month_weeks(date){
	const year = date.getUTCFullYear(), month = date.getUTCMonth(), current = new Date(Date.UTC(year, month, 1)), weeks = [];
	current.setUTCDate(1 - (current.getUTCDay() + 6) % 7);
	
	do{
		const week = {
			number: week_number(current),
			days: []
		};
		for(let i = 0; i < 7; i++){
			week.days.push({
				year: current.getUTCFullYear(),
				month: current.getUTCMonth() + 1,
				day: current.getUTCDate(),
				current_month: current.getUTCMonth() === month
			});
			current.setUTCDate(current.getUTCDate() + 1);
		}
		weeks.push(week);
	} while(current.getUTCFullYear() === year && current.getUTCMonth() === month);
	
	return weeks;
}

function week_number(date){
	const d = new Date(date);
	d.setUTCHours(0, 0, 0, 0);
	d.setUTCDate(d.getUTCDate() + 3 - (d.getUTCDay() + 6) % 7);
	const first = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
	return Math.ceil(((d - first) / 86400000 + 1) / 7);
}