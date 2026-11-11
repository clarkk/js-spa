export function html(s){
	if(!s) return '';
	return String(s)
		.replace(/&/g, "&amp;")
		.replace(/</g, "&lt;")
		.replace(/>/g, "&gt;")
		.replace(/"/g, "&quot;")
		.replace(/'/g, "&#39;");
};

export function amount(s, f=2, thousands=true){
	const [int, dec] = Number(s).toFixed(f).split('.');
	return (thousands ? int.replace(/\B(?=(\d{3})+(?!\d))/g, '.') : int)+','+dec;
}

export function date(time){
	return format_date(time === 'now' ? new Date() : new Date(time * 1000));
}

export function datetime(time){
	const d = new Date(time * 1000), hour = String(d.getHours()).padStart(2, '0'), min = String(d.getMinutes()).padStart(2, '0');
	return `${format_date(d)} ${hour}:${min}`;
}

function format_date(d){
	const day = String(d.getDate()).padStart(2, '0'), month = String(d.getMonth() + 1).padStart(2, '0'), year = d.getFullYear();
	return `${day}-${month}-${year}`;
}