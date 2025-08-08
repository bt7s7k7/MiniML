/* eslint-disable no-console */
import { EMPTY_SET } from "../comTypes/const"
import { Optional } from "../comTypes/Optional"
import { ensureKey, Reducers, unreachable } from "../comTypes/util"
import { DeserializationError, Type } from "../struct/Type"

const _INVALID = Symbol.for("cli.invalidArgument")

function _parseArgumentValue(name: string, value: string, type: Type<any>, errors: string[]): any | typeof _INVALID {
    if (Type.isNullable(type)) {
        type = type.base
    }

    if (type.name == Type.string.name) {
        return value
    } else if (Type.isEnum(type)) {
        const result = Optional.pcall(() => type.deserialize(value)).unwrapOrError()
        if (result instanceof Error) {
            if (result instanceof DeserializationError) {
                errors.push(`Invalid value for "${name}", ${result.message}`)
                return _INVALID
            }

            throw result
        }
        return result
    } else if (type.name == Type.number.name) {
        const number = parseInt(value)
        if (isNaN(number)) {
            errors.push(`Expected number for parameter "${name}"`)
            return _INVALID
        }
        return number
    } else if (type.name == Type.boolean.name) {
        const boolValue = value == "true" || value == "1" ? (
            true
        ) : value == "false" || value == "0" ? (
            false
        ) : null

        if (boolValue == null) {
            errors.push(`Expected boolean for parameter "${name}"`)
            return _INVALID
        }
    }

    const result = Optional.pcall(() => type.deserialize(JSON.parse(value))).unwrapOrError()
    if (result instanceof Error) {
        if (result instanceof DeserializationError || result instanceof SyntaxError) {
            errors.push(`Invalid value for "${name}", ${result.message}`)
            return _INVALID
        }

        throw result
    }

    return result
}

export class Cli {
    protected readonly _root = new Cli.Command("", "")

    public addOption<
        const TParams extends readonly [string, Type<any>][] = [],
        const TOptions extends Record<string, Type<any>> = {}
    >(options: {
        name: string, desc: string,
        options?: TOptions, params?: TParams,
        callback: (
            ...args: [
                ...{ [P in keyof TParams]: Type.Extract<TParams[P][1]> },
                { [P in keyof TOptions]: Type.Extract<TOptions[P]> }
            ]
        ) => Promise<number | undefined | void>
    },
    ) {
        const impl: Cli.CommandImpl = {
            desc: options.desc,
            options: options.options == null ? null : new Map(Object.entries(options.options)),
            params: options.params ?? null,
            callback: options.callback as any,
        }
        this._root.makeCommand(options.name.split(" "), 0, impl)
        return this
    }

    public printHelp() {
        console.log(`Usage: ${this.exeName}`)
        const commands = [...this._root.getCommands()]
        const maxLength = commands.reduce(Reducers.largest(v => v.fullName.length), null)?.value ?? 0

        for (const command of commands) {
            console.log("  " + command.fullName.padEnd(maxLength, " ") + " - " + command.desc)
            const parameters = command.getHelpString() ?? unreachable()
            if (parameters.length > 0) {
                console.log("    " + parameters)
            }
        }
    }

    public async execute(args: string[]) {
        const exitCode = await this._root.execute(args, 0)
        if (exitCode != null) return exitCode

        console.log("Command not found")
        console.log("")
        this.printHelp()
        return 1
    }

    public printOutput(...args: any[]) {
        console.log(...args)
    }

    public autocomplete(input: string) {
        return [...this._root.getCommands()].map(v => v.fullName).filter(v => v.startsWith(input))
    }

    constructor(
        public readonly exeName: string,
    ) { }
}

export namespace Cli {
    export interface CommandImpl {
        desc: string
        params: readonly [string, Type<any>][] | null
        options: Map<string, Type<any>> | null
        callback(args: any[]): Promise<number | undefined | void>
    }

    export class Command {
        public readonly children = new Map<string, Command>()
        public get desc() { return this._impl?.desc ?? unreachable() }
        protected _impl: CommandImpl | null = null

        public *getCommands(): Generator<Command> {
            if (this._impl != null) yield this
            for (const command of this.children.values()) {
                yield* command.getCommands()
            }
        }

        public makeCommand(name: string[], index: number, impl: CommandImpl) {
            if (index >= name.length) {
                if (this._impl != null) {
                    throw new Error(`Duplicate definition of command "${this.name}"`)
                }

                this._impl = impl
                return
            }

            const childCommand = ensureKey(this.children, name[index], () => new Command(name[index], name.slice(0, index + 1).join(" ") || ":default:"))
            childCommand.makeCommand(name, index + 1, impl)
        }

        public async execute(args: string[], index: number): Promise<number | null> {
            if (args.length + 1 <= index) {
                return null
            }

            const name = args[index]
            const childCommand = this.children.get(name)
            if (childCommand != null) {
                return childCommand.execute(args, index + 1)
            }

            if (this._impl == null) {
                const implicit = this.children.get("")
                if (implicit) {
                    return implicit.execute(args, index)
                }
                return null
            }

            const impl = this._impl

            const unnamedArguments: any[] = []
            const namedArguments: Record<string, any> = Object.create(null)
            const missingArguments = impl.options == null ? EMPTY_SET as never : new Set([...impl.options].map(v => v[0]))
            const errors: string[] = []
            let endOfOptions = false
            for (let i = index; i < args.length; i++) {
                let argument = args[i]

                if (!endOfOptions) {
                    if (argument == "--") {
                        endOfOptions = true
                        continue
                    }

                    if (argument.startsWith("--")) {
                        argument = argument.slice(2)
                        const valueStart = argument.indexOf("=")
                        const name = valueStart == -1 ? argument : argument.slice(0, valueStart)
                        const value = valueStart == -1 ? "true" : argument.slice(valueStart + 1)

                        const argumentType = impl.options?.get(name)
                        if (argumentType == null) {
                            errors.push(`Unknown parameter "--${name}"`)
                            continue
                        }

                        const parsedValue = _parseArgumentValue(`--${name}`, value, argumentType, errors)
                        if (parsedValue == _INVALID) {
                            continue
                        }

                        missingArguments.delete(name)
                        namedArguments[name] = parsedValue
                        continue
                    }
                }

                const unnamedIndex = unnamedArguments.length
                if (impl.params == null || unnamedIndex >= impl.params.length) {
                    errors.push(`Unexpected unnamed parameter at index ${unnamedIndex}`)
                    continue
                }

                const [name, type] = impl.params[unnamedIndex]
                const parsedValue = _parseArgumentValue(`<${name}>`, argument, type, errors)
                if (parsedValue == _INVALID) {
                    unnamedArguments.push(_INVALID)
                    continue
                }

                unnamedArguments.push(parsedValue)
            }

            if (impl.params) {
                while (unnamedArguments.length < impl.params.length) {
                    const index = unnamedArguments.length
                    const [name, type] = impl.params[index]
                    if (Type.isNullable(type)) {
                        unnamedArguments.push(null)
                        continue
                    }

                    errors.push(`Missing parameter "<${name}>"`)
                    unnamedArguments.push(_INVALID)
                }
            }

            if (missingArguments.size > 0) {
                for (const missing of missingArguments) {
                    const type = impl.options!.get(missing)!
                    if (Type.isNullable(type)) {
                        namedArguments[missing] = null
                    } else if (Type.isOptional(type)) {
                        namedArguments[missing] = type.default()
                    } else {
                        errors.push(`Missing option "--${missing}"`)
                    }
                }
            }

            if (errors.length > 0) {
                for (const error of errors) {
                    console.log(error)
                }
                console.log("")
                console.log("Expected parameters: " + this.getHelpString())
                return 1
            }

            // @ts-ignore
            const exitCode = await impl.callback(...unnamedArguments, namedArguments)
            return exitCode ?? 0
        }

        public getHelpString() {
            if (this._impl == null) return null

            const result: string[] = []
            if (this._impl.params) {
                for (const [name, type] of this._impl.params) {
                    result.push(`<${name}>: ${type.name}`)
                }
            }

            if (this._impl.options) {
                for (const [name, type] of this._impl.options) {
                    result.push(`--${name}: ${type.name}`)
                }
            }

            return result.join(", ")
        }

        constructor(
            public readonly name: string,
            public readonly fullName: string,
        ) { }
    }
}
