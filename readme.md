
# Ts-Dedupe

A cli tool to move duplicated types and interfaces to a single file.


## Features

* Moves duplicate interfaces and types to a single file
* Renames types / interfaces with the same name but different structure
* Organises imports in files
* Deletes empty files
* Creates a barrel file exporting all types in project


## Options

| Argument | Alias | Type | Description |
|-|-|-|-|
| **project** | **p** | string | Location of the tsconfig file for your project. Defaults to 'tsconfig.json' |
| **duplicatesFile** | **d** | string | Path of the file where duplicate types will be moved to. |
| **retainEmptyFiles** | **r** | boolean | If specified empty files will not be removed (may cause issues if also generating a barrel file) |
| **barrelFile** | **b** | string | Optional. If specified will generate a barrel file for all the files in your project. |
| **help** | **h** | boolean | Displays the help guide. |

[//]: ####ts-command-line-args_write-markdown_replaceAbove

## Programmatic Usage



## Limitations

When comparing interfaces or types to see if they can be de-duplicated differences in comments or whitespace will mean that the types will be regarded as different.

```ts
export interface IEmployee {
    name: string;
    department: Department;
}
```

and 

```ts
export interface IEmployee {
    name: string; //first and last
    department: Department;
}
```

will be regarded as different types and will not be de-duplicated.