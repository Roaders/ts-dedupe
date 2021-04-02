# TS Dedupe

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