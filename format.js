export function html(s){
	if(!s) return '';
	return String(s)
		.replace(/&/g, "&amp;")
		.replace(/</g, "&lt;")
		.replace(/>/g, "&gt;")
		.replace(/"/g, "&quot;")
		.replace(/'/g, "&#39;");
};

export function amount(s, f=2){
	const [int, dec] = Number(s).toFixed(f).split('.');
	return int.replace(/\B(?=(\d{3})+(?!\d))/g, '.')+','+dec;
}

export function date(time){
	return format_date(new Date(time * 1000));
}

export function datetime(time){
	const n = new Date(time * 1000), hour = String(n.getHours()).padStart(2, '0'), min = String(n.getMinutes()).padStart(2, '0');
	return `${format_date(n)} ${hour}:${min}`;
}

function format_date(d){
	const day = String(d.getDate()).padStart(2, '0'), month = String(d.getMonth() + 1).padStart(2, '0'), year = d.getFullYear();
	return `${day}-${month}-${year}`;
}