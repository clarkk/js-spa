export const
	ERROR_NULL = 'null',
	ERROR_STRING = 'string',
	ERROR_DECIMAL = 'decimal',
	ERROR_INT32 = 'int32',
	ERROR_INT64 = 'int64',
	ERROR_UINT32 = 'uint32',
	ERROR_UINT64 = 'uint64',
	ERROR_BOOL = 'boolean',
	
	SOURCE = 'convert';

const TYPE_STRING='string', TYPE_INT='integer', TYPE_BOOL='boolean',
	FORMAT_DECIMAL='decimal', FORMAT_INT32='int32', FORMAT_INT64='int64', FORMAT_UINT32='uint32', FORMAT_UINT64='uint64',
	RE_INT_SIGNED=/^-?\d+$/, RE_INT_UNSIGNED=/^\d+$/, RE_DECIMAL=/^-?\d+(?:[.,]\d+)?$/,
	MIN_INT32=-2147483648n, MAX_INT32=2147483647n, MAX_UINT32=4294967295n, MIN_INT64=-9223372036854775808n, MAX_INT64=9223372036854775807n, MAX_UINT64=18446744073709551615n;

export function convert(model_schema, name, value){
	const field = model_schema.fields[name];
	if(!field) throw Error(`Model schema input field '${name}' does not exist`);
	
	if(value === null) return field.nullable ? result(value) : error(ERROR_NULL);
	
	switch(field.type){
	case TYPE_STRING:
		return convert_string(field, value);
	case TYPE_INT:
		return convert_integer(field, value);
	case TYPE_BOOL:
		return convert_boolean(value);
	default:
		throw Error(`Unsupported type '${field.type}'`);
	}
}

function convert_string(field, value){
	const type = typeof value;
	if(type !== TYPE_STRING && (type !== 'number' || !Number.isFinite(value))) return error(ERROR_STRING);
	
	switch(field.format){
	case '':
	case undefined:
	case null:
		return result(String(value));
		
	case FORMAT_DECIMAL:
		return convert_format_decimal(value);
		
	default:
		throw Error(`Unsupported string format '${field.format}'`);
	}
}

function convert_integer(field, value){
	const type = typeof value;
	if(type !== TYPE_STRING && type !== 'number' && type !== 'bigint') return error_int(field.format);
	if(type === 'number' && !Number.isSafeInteger(value)) return error_int(field.format);
	
	const s = String(value);
	switch(field.format){
	case FORMAT_INT32:
	case FORMAT_INT64:
		if(!RE_INT_SIGNED.test(s)) return error_int(field.format);
		break;
		
	case FORMAT_UINT32:
	case FORMAT_UINT64:
		if(!RE_INT_UNSIGNED.test(s)) return error_int(field.format);
		break;
		
	default:
		throw Error(`Unsupported integer format '${field.format}'`);
	}
	
	const b = BigInt(s);
	switch(field.format){
	case FORMAT_INT32:
		if(b < MIN_INT32 || b > MAX_INT32) return error_int(field.format);
		break;
		
	case FORMAT_UINT32:
		if(b > MAX_UINT32 || b < 0) return error_int(field.format);
		break;
		
	case FORMAT_INT64:
		if(b < MIN_INT64 || b > MAX_INT64) return error_int(field.format);
		break;
		
	case FORMAT_UINT64:
		if(b > MAX_UINT64 || b < 0) return error_int(field.format);
		break;
	}
	
	const n = Number(b);
	if(!Number.isSafeInteger(n)) return error_int(field.format);
	return result(n);
}

function convert_boolean(value){
	if(typeof value === TYPE_BOOL){
		return result(value);
	}
	return error(ERROR_BOOL);
}

function convert_format_decimal(value){
	const s = String(value);
	if(!RE_DECIMAL.test(s)) return error(ERROR_DECIMAL);
	return result(s.replace(',', '.'));
}

function result(value){
	return {
		value
	};
}

function error(error){
	return {
		error
	};
}

function error_int(format){
	switch(format){
	case FORMAT_INT32:
		return error(ERROR_INT32);
	case FORMAT_INT64:
		return error(ERROR_INT64);
	case FORMAT_UINT32:
		return error(ERROR_UINT32);
	case FORMAT_UINT64:
		return error(ERROR_UINT64);
	default:
		throw Error(`Unsupported int format '${format}'`);
	}
}