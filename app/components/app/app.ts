import {Component, ViewChild, EventEmitter} from '@angular/core';
import {MemoryBlock} from "./../../emulation/memory-block";
import {CPU, Interrupt} from "./../../emulation/cpu";
import {Assembler} from "./../../assembly/assembler";
import {Program} from "./../../assembly/program";
import {AsmEditor} from "../asm-editor/asm-editor";
import {CpuComponent} from "../cpu/cpu";
import {MemoryComponent} from "../memory/memory";
import {Runtime} from "../../emulation/runtime";
import {Process} from "../../emulation/process";
import {ExecutionComponent} from "../execution/execution";
import {ConsoleComponent} from "../console/console";
import {RuntimeException} from "../../emulation/runtime-exception";

@Component({
    selector: "app",
    templateUrl: "app/components/app/app.html",
    directives: [AsmEditor, CpuComponent, MemoryComponent, ExecutionComponent, ConsoleComponent]
})
export class App
{
    @ViewChild(AsmEditor) asmEditor: AsmEditor;
    @ViewChild(ConsoleComponent) console: ConsoleComponent;

    private runtime: Runtime = new Runtime();
    private assembler: Assembler = new Assembler();
    private cpu: CPU;

    private memorySize: number = 256;
    private compileErrors: string = "";

    private compileSource(source: string)
    {
        try
        {
            let program: Program = this.assembler.assemble(source);
            let memory: MemoryBlock = new MemoryBlock(this.memorySize);
            this.cpu = new CPU(program, memory);
            this.cpu.onInterrupt.subscribe((interrupt: Interrupt) => this.handleInterrupt(interrupt));
            this.cpu.onError.subscribe((runtimeException: RuntimeException) => alert(runtimeException.message));
            this.cpu.breakpoints = this.asmEditor.breakpoints;
            this.runtime.process = new Process(this.cpu);

            this.compileErrors = "";
        }
        catch (e)
        {
            this.compileErrors = `Error at line ${e.line}: ${e.message}`;
        }
    }

    private handleInterrupt(interrupt: Interrupt)
    {
        try
        {
            switch (interrupt)
            {
                case Interrupt.WRITE_NUM:
                    this.print(this.cpu.getRegisterByName("EAX").getValue().toString());
                    break;
                case Interrupt.WRITE_STRING:
                {
                    let data: string = "";
                    let start: number = this.cpu.getRegisterByName("EAX").getValue();
                    while (true)
                    {
                        let char = this.cpu.deref_address(start, 1).getValue();
                        if (char == 0) break;
                        data += String.fromCharCode(char);
                        start++;
                    }
                    this.print(data);
                    break;
                }
            }
        }
        catch (e)
        {
            alert(e.message);
        }
    }

    private print(value: string)
    {
        this.console.print(value);
    }

    private onBreakpointChanged(breakpoints: number[])
    {
        if (this.runtime.hasProcess())
        {
            this.runtime.process.cpu.breakpoints = breakpoints;
        }
    }

    private getActiveLine(): number
    {
        if (this.runtime.hasProcess() && this.runtime.process.isStarted())
        {
            return this.runtime.process.cpu.activeLine;
        }
        else return null;
    }
}
