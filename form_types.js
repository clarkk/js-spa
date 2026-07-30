const TYPE_STRING='string', TYPE_INT='integer', TYPE_BOOLEAN='boolean',
	FORMAT_DECIMAL='decimal', FORMAT_INT32='int32', FORMAT_INT64='int64', FORMAT_UINT32='uint32', FORMAT_UINT64='uint64';

export function convert(model_schema, name, value){
	const field = model_schema.fields[name];
	if(!field) throw Error(`Model schema input field '${name}' does not exist`);
	
	console.log(name, field)
	
	if(value === null){
		return field.nullable ? {
			value
		} : {
			error: 'Value can not be null'
		};
	}
	
	return {
		error: 'test error!'
	};
}