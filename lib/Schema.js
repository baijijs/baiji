'use strict';

const _ = require('lodash');
const Normalizer = require('baiji-normalizer');

// Extend Normalizer `buffer` support
Normalizer.define('buffer', function convertBuffer(val) {
  if (val === undefined || val === null || Buffer.isBuffer(val)) return val;
  return Buffer.from(val);
});

// Extend Normalizer `file` support
Normalizer.define('file', function convertFile(val) { return val; });

// File type
class File {
  constructor(obj) {
    Object.assign(this, obj);
  }
}

// Initial Types
const TYPES = {
  string: String,
  boolean: Boolean,
  number: Number,
  date: Date,
  buffer: Buffer,
  file: File
};

// Type cast function
let typeCast;

function buildTypeCast() {
  let typeKeys = _.keys(TYPES);
  let typeValues = _.values(TYPES);

  typeCast = function(type) {
    let index = typeKeys.indexOf(type);
    if (index !== -1) return type;
    index = typeValues.indexOf(type);
    if (index !== -1) return typeKeys[index];

    if (_.isString(type)) {
      type = type.toLowerCase();
      if (TYPES[type]) return type;
    }

    return null;
  };
}

buildTypeCast();

// Check if a value is a basic type
function isBasicSchema(type) {
  if (!type) return false;
  return !!typeCast(type.type || type);
}

// {
//   avatar: { type: 'file', maxCount: 1 },
//   image: 'file',
//   username: 'string'
// }

// Interpret as Type
// {
//   type: 'string',
//   default: 1,
//   get: async function(ctx) {},
//   value: 2,
//   enum: [],
//   required: true,
//   description: ''
// }
class SchemaType {
  constructor(obj, options = {}) {
    const { defaultGetter, path } = options;

    this.path = path;

    let isPlainObject = _.isPlainObject(obj);

    let _obj = isPlainObject ? obj : {};

    let type = isPlainObject ?
      this.typeCast(obj.type, path) :
      this.typeCast(obj, path);

    let _schema = {
      $__type__: true,
      path,
      type,
      default: _obj.default,
      get: typeof _obj.get == 'function' ? _obj.get : defaultGetter,
      value: _obj.value,
      enum: _obj.enum ? _obj.enum : undefined,
      required: !!_obj.required,
      description: _obj.description || _obj.desc || '',
      notes: _obj.notes || ''
    };

    if (type === 'file') {
      let maxCount = _obj.maxCount || 1;
      _schema.maxCount = maxCount >= 0 ? parseInt(maxCount) : 0;
    }

    this._schema = _schema;
  }

  get type() {
    return this._schema.type;
  }

  typeCast(type, path = '') {
    let _type = typeCast(type);

    if (_type) {
      return _type;
    } else {
      throw new TypeError('Invalid type for schema path `' + path + '`');
    }
  }

  async parse(val, options = {}) {
    const { context } = options;
    let value;
    let _schema = this._schema;

    if (_schema.value != null) return _schema.value;

    if (_.isFunction(_schema.get)) {
      value = await Promise.resolve(_schema.get(context));
    } else {
      value = Normalizer.tryConvert(val, _schema.type);
    }

    if (value == null && _schema.default !== undefined) value = _schema.default;

    return value;
  }

  asJSON() {
    return this._schema;
  }

  valueOf() {
    return this._schema;
  }
}

class SchemaArrayType {
  constructor(schema, options = {}) {
    const { path } = options;

    this.path = path;

    this._schema = schema;
  }

  get type() {
    return 'array';
  }

  async parse(val, options = {}) {
    let arr = Normalizer.tryConvert(
      val,
      ['any'],
      {
        arrayItemDelimiters: options.arrayItemDelimiters,
        coerce: false
      }
    );

    return await Promise.all(arr.map(v => {
      return this._schema.parse(v, options);
    }));
  }

  asJSON() {
    return [this._schema.asJSON()];
  }
}

class SchemaObjectType {
  constructor(schemas = {}, options = {}) {
    const { path } = options;

    this.path = path;

    this.fields = Object.keys(schemas);
    this.schemas = schemas;
  }

  get type() {
    return 'object';
  }

  async parse(obj, options = {}) {
    obj = obj || {};

    let value = {};
    for (let i = 0; i < this.fields.length; i++) {
      let key = this.fields[i];
      value[key] = await this.schemas[key].parse(obj[key], options);
    }

    return value;
  }

  asJSON() {
    let value = {};
    for (let i = 0; i < this.fields.length; i++) {
      let key = this.fields[i];
      value[key] = this.schemas[key].asJSON();
    }

    return value;
  }
}

/**
 * Schema constructor.
 *
 * ####Example:
 *
 *     var child = new Schema({ name: String });
 *     var schema = new Schema({ name: String, age: Number, children: [child] });
 *
 *     // setting schema options
 *     new Schema({ name: String }, { _id: false, autoIndex: false })
 *
 * ####Options:
 *
 * - [strict](/docs/guide.html#strict): bool - defaults to true
 * - [validate](/docs/guide.html#validate) - function - defaults to `null`
 *
 * ####Note:
 *
 * _When nesting schemas, (`children` in the example above), always declare the child schema first before passing it into its parent._
 *
 * @param {Object} definition
 * @param {Object} [options]
 * @api public
 */
class Schema {
  static get TYPES() { return TYPES; }
  static addType(typeKey, typeKlass) {
    TYPES[typeKey] = typeKlass;
    buildTypeCast();
  }

  static from(obj, options = {}) {

    let schema;

    // API for validators
    if (_.isFunction(obj.toBaijiSchema)) {
      schema = obj.toBaijiSchema(options);
    } else {
      schema = new Schema(obj, options);
    }

    if (schema instanceof Schema) return schema;

    throw new Error('Invalid schema');
  }

  constructor(obj, options = {}) {
    this.options = this.defaultOptions(options);

    this._paths = {};

    this._schema = this.build(obj);
  }

  defaultOptions(options = {}) {
    return {
      validate: typeof options.validate === 'function' ? options.validate : null
    };
  }

  path(schemaType, path, obj) {
    let schema = null;

    if (schemaType === 'basic') {
      schema = new SchemaType(obj, { path });
    } else if (schemaType === 'array') {
      schema =  new SchemaArrayType(obj, { path });
    } else if (schemaType === 'object') {
      schema = new SchemaObjectType(obj, { path });
    }

    this._paths[schema.type] = this._paths[schema.type] || {};
    this._paths[schema.type][path] = schema;

    return schema;
  }

  pathsByType(type) {
    return this._paths[type] || {};
  }

  hasType(type) {
    return _.isEmpty(this.pathsByType(type));
  }

  makePath(prefix = '', key = '') {
    if (key.indexOf('[') !== -1) {
      return prefix + key;
    } else {
      return prefix ? prefix + '.' + key : key;
    }
  }

  build(obj, prefix = '') {
    // Clone schema
    if (obj instanceof Schema) return this.build(obj.asJSON(), prefix);

    // Handle object
    if (_.isPlainObject(obj)) {
      // Handle basic type
      if (isBasicSchema(obj)) return this.path('basic', prefix, obj);

      // Handle array type: { type: [String] } or { type: [{ type: String }] }
      if (Array.isArray(obj.type) && isBasicSchema(obj.type[0])) {
        let _obj = Object.assign(
          {},
          obj,
          obj.type[0].type ? obj.type[0] : { type: obj.type[0] }
        );

        return this.path(
          'array',
          prefix,
          this.path('basic', this.makePath(prefix, '[0]'), _obj)
        );
      }

      const keys = Object.keys(obj);
      let _obj = {};

      for (let i = 0; i < keys.length; ++i) {
        const key = keys[i];
        let val = obj[key];

        let path = this.makePath(prefix, key);

        if (val == null) {
          throw new TypeError('Invalid value for schema path `' + path + '`');
        }

        if (Array.isArray(val)) {
          _obj[key] = this.build(val, path);
        } else if (_.isPlainObject(val)) {
          // Handle nested object
          if (_.isEmpty(val)) {
            // mixed type
            _obj[key] = this.path('object', path, val);
          } else {
            _obj[key] = this.build(val, path);
          }
        } else {
          _obj[key] = this.path('basic', path, val);
        }
      }

      return this.path('object', prefix, _obj);
    } else if (Array.isArray(obj)) {
      let path = this.makePath(prefix, '[0]');
      if (obj.length === 1 && obj[0] != null) {
        return this.path('array', prefix, this.build(obj[0], path));
      } else {
        throw new TypeError('Invalid value for schema Array path `' + path + '`');
      }
    } else {
      return this.path('basic', prefix, obj);
    }
  }

  async parse(val, options = {}) {
    const { validate } = this.options;
    let result = await this._schema.parse(val, options);

    if (_.isFunction(validate)) {
      result = await Promise.resolve(validate(result, options));
    }

    return result;
  }

  asJSON() {
    return this._schema.asJSON();
  }

  clone() {
    return new Schema(this.asJSON(), this.options);
  }
}

module.exports = Schema;
