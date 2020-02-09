import { ExtensionConfig } from './Csharp2ts/config'

export function getConfig(): ExtensionConfig {
    return {
        //True for camelCase, false for preserving original name. Default is true
        propertiesToCamelCase: false,
        //Removes specified postfixes from property names, types & class names. Can be array OR string. Case-sensitive.
        trimPostfixes: [],
        //Whether or not trim postfixes recursive. (e.g. with postfixes 'A' & 'B' PersonAAB will become PersonAA when it's false & Person when it's true)
        recursiveTrimPostfixes: false,
        //Ignore property initializer
        ignoreInitializer: true,
        //True to remove method bodies, false to preserve the body as-is
        removeMethodBodies: true,
        //True to remove class constructors, false to treat then like any other method
        removeConstructors: false,
        //'signature' to emit a method signature, 'lambda' to emit a lambda function. 'controller' to emit a lambda to call an async controller
        methodStyle: 'signature',
        //True to convert C# byte array type to Typescript string, defaults to true since the serialization of C# byte[] results in a string
        byteArrayToString: true,
        //"True to convert C# DateTime and DateTimeOffset to Typescript (Date | string), defaults to true since the serialization of C# DateTime results in a string"s
        dateToDateOrString: true,
        /*Modifiers to remove. Ex. if you want to remove private and internal members set to ['private', 'internal']*/
        removeWithModifier: [],
        /*If setted, any property or field that its name matches the given regex will be removed, Ex. if you want to remove backing fields starting with underscore set to "_[a-z][a-zA-Z0-9]*" */
        removeNameRegex: '',
        /*True to convert classes to interfaces, false to convert classes to classes. Default is true*/
        classToInterface: true,
        /*True to preserve fields and property modifiers. Default is false*/
        preserveModifiers: false
    }
}

export const errorLabels = {
    notMatching: 'cs not matching ts'
}
