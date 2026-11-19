export const
	ERROR_NULL = 'null',
	ERROR_STRING = 'string',
	ERROR_DECIMAL = 'decimal',
	ERROR_INT32 = 'int32',
	ERROR_INT64 = 'int64',
	ERROR_UINT32 = 'uint32',
	ERROR_UINT64 = 'uint64',
	ERROR_BOOL = 'boolean',
	
	ERROR_PARSE = 'parse',
	
	SOURCE = 'convert';

const TYPE_STRING='string', TYPE_INT='integer', TYPE_BOOL='boolean',
	RE_INT_SIGNED=/^-?\d+$/, RE_INT_UNSIGNED=/^\d+$/, RE_DECIMAL=/^-?\d+(?:[.,]\d+)?$/,
	MIN_INT32=-2147483648n, MAX_INT32=2147483647n, MAX_UINT32=4294967295n, MIN_INT64=-9223372036854775808n, MAX_INT64=9223372036854775807n, MAX_UINT64=18446744073709551615n;

const INTEGER_FORMATS = {
	[ERROR_INT32]: {pattern: RE_INT_SIGNED, min: MIN_INT32, max: MAX_INT32},
	[ERROR_INT64]: {pattern: RE_INT_SIGNED, min: MIN_INT64, max: MAX_INT64},
	[ERROR_UINT32]: {pattern: RE_INT_UNSIGNED, min: 0n, max: MAX_UINT32},
	[ERROR_UINT64]: {pattern: RE_INT_UNSIGNED, min: 0n, max: MAX_UINT64}
};

export function convert(model_schema, name, value){
	const field = model_schema.fields[name];
	if(!field) throw Error(`Model schema input field '${name}' does not exist`);
	
	if(value === null) return field.nullable ? result(value) : error(ERROR_NULL);
	
	switch(field.type){
	case TYPE_STRING:
		return convert_string(name, field, value);
	case TYPE_INT:
		return convert_integer(name, field, value);
	case TYPE_BOOL:
		return convert_boolean(value);
	default:
		throw Error(`Unsupported type '${field.type}'`);
	}
}

function convert_string(name, field, value){
	const type = typeof value;
	if(type !== TYPE_STRING && (type !== 'number' || !Number.isFinite(value))) return error(ERROR_STRING);
	
	switch(field.format){
	case undefined:
		return result(String(value));
	case ERROR_DECIMAL:
		return convert_format_decimal(value);
	default:
		throw Error(`Unsupported string format '${field.format}' in ${name}`);
	}
}

function convert_integer(name, field, value){
	const format = field.format ?? ERROR_INT32, config = INTEGER_FORMATS[format], type = typeof value;
	if(!config) throw Error(`Unsupported integer format '${format}' in ${name}`);
	if(type !== TYPE_STRING && type !== 'number' && type !== 'bigint') return error(format);
	if(type === 'number' && !Number.isSafeInteger(value)) return error(format);
	
	const s = String(value);
	if(!config.pattern.test(s)) return error(format);
	
	const b = BigInt(s);
	if(b < config.min || b > config.max) return error(format);
	
	const n = Number(b);
	return Number.isSafeInteger(n) ? result(n) : error(format);
}

function convert_boolean(value){
	if(typeof value === TYPE_BOOL) return result(value);
	return error(ERROR_BOOL);
}

function convert_format_decimal(value){
	const s = String(value);
	if(!RE_DECIMAL.test(s)) return error(ERROR_DECIMAL);
	return result(s.replace(',', '.'));
}

function result(value){
	return {value};
}

function error(error){
	return {error};
}