/* ---------------------------------------------------------------------------------- *\
|                                                                                      |
|  Copyright (c) 2021, NVIDIA CORPORATION. All rights reserved.                        |
|                                                                                      |
|  The contents of this file are licensed under the Eclipse Public License 2.0.        |
|  The full terms of the license are available at https://eclipse.org/legal/epl-2.0/   |
|                                                                                      |
|  SPDX-License-Identifier: EPL-2.0                                                    |
|                                                                                      |
\* ---------------------------------------------------------------------------------- */
/* eslint-disable no-param-reassign */
/* eslint-disable max-classes-per-file */
import { DebugProtocol } from '@vscode/debugprotocol';
import { GDBBackend, GDBTargetDebugSession } from 'cdt-gdb-adapter';
import { ChildProcess } from 'node:child_process';
import { EventEmitter } from 'node:events';
import { logger, OutputEvent, TerminatedEvent } from '@vscode/debugadapter';
import { CudaGdbSession, CudaGdbBackend } from './cudaGdbSession';
import { CudaTargetLaunchRequestArguments, CudaTargetAttachRequestArguments } from './cudaGdbServerSession';

class CudaQNXGdbServerBackend extends CudaGdbBackend {
    async spawn(args: CudaTargetAttachRequestArguments): Promise<void> {
        await super.spawn(args);
    }
}

export class CudaQnxGdbServerSession extends CudaGdbSession {
    private readonly gdbTargetDebugSession: GDBTargetDebugSession = new GDBTargetDebugSession();

    protected gdbserver?: ChildProcess;

    protected isInitialized = false;

    protected async setBreakPointsRequest(response: DebugProtocol.SetBreakpointsResponse, args: DebugProtocol.SetBreakpointsArguments): Promise<void> {
        await (this.gdbTargetDebugSession as any).setBreakPointsRequest.call(this, response, args);
    }

    protected createBackend(): GDBBackend {
        const backend: CudaGdbBackend = new CudaQNXGdbServerBackend(this);
        const emitter: EventEmitter = backend as EventEmitter;

        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        emitter.on(CudaGdbBackend.eventCudaGdbExit, (code: number, signal: string) => {
            if (code === CudaGdbSession.codeModuleNotFound) {
                this.sendEvent(new OutputEvent('Failed to find cuda-gdb or a dependent library.'));
                this.sendEvent(new TerminatedEvent());
            }
        });

        return backend;
    }

    public async spawn(args: CudaTargetAttachRequestArguments): Promise<void> {
        await (this.gdbTargetDebugSession as any).spawn.call(this, args);
    }

    protected setupCommonLoggerAndHandlers(args: CudaTargetAttachRequestArguments): void {
        (this.gdbTargetDebugSession as any).setupCommonLoggerAndHandlers.call(this, args);
    }

    /**
     * It is intentional that this function overrides the base class implementation
     */

    protected async launchRequest(response: DebugProtocol.LaunchResponse, args: CudaTargetLaunchRequestArguments): Promise<void> {
        logger.verbose('Executing launch request');

        this.initializeLogger(args);

        let ok = await this.validateLinuxPlatform(response);
        if (!ok) {
            // Error response sent within validateLinuxPlatform
            return;
        }

        const cdtLaunchArgs: CudaTargetAttachRequestArguments = { ...args };

        // Assume true for isQNX in the QNX server session
        const isQNX = true;

        ok = await this.runConfigureLaunch(response, args, cdtLaunchArgs, 'LaunchRequest');
        if (!ok) {
            // Error response sent within runConfigureLaunch
            return;
        }

        // This also sets the path if found
        ok = await this.validateAndSetCudaGdbPath(response, cdtLaunchArgs, isQNX);
        if (!ok) {
            // Error response sent within validateAndSetCudaGdbPath
            return;
        }

        logger.verbose('Calling launch request in super class');
        await (this.gdbTargetDebugSession as any).launchRequest.call(this, response, cdtLaunchArgs);
    }

    /* eslint-disable @typescript-eslint/no-unused-vars */
    // eslint-disable-next-line class-methods-use-this
    protected async startGDBServer(args: CudaTargetLaunchRequestArguments): Promise<void> {
        // This function is defined so that we do not inadvertently call cdt-gdb-adapter's implementation of this function
    }
    /* eslint-enable @typescript-eslint/no-unused-vars */

    protected attachOrLaunchRequest(response: DebugProtocol.Response, request: 'launch' | 'attach', args: CudaTargetLaunchRequestArguments): Promise<void> {
        return (this.gdbTargetDebugSession as any).attachOrLaunchRequest.call(this, response, request, args, true);
    }

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    protected async startGDBAndAttachToTarget(response: DebugProtocol.AttachResponse | DebugProtocol.LaunchResponse, args: CudaTargetAttachRequestArguments, isQNX = true): Promise<void> {
        await (this.gdbTargetDebugSession as any).startGDBAndAttachToTarget.call(this, response, args, true);
    }
}

/* eslint-enable max-classes-per-file */
/* eslint-enable no-param-reassign */
