#  ----------------------------------------------------------------------------------
#
#  Copyright (c) 2021, NVIDIA CORPORATION. All rights reserved.
#
#  The contents of this file are licensed under the Eclipse Public License 2.0.
#  The full terms of the license are available at https://eclipse.org/legal/epl-2.0/
#
#  SPDX-License-Identifier: EPL-2.0
#
#  ----------------------------------------------------------------------------------


all: build

build: concurrent

concurrent: concurrent.cu
	nvcc -arch=sm_75 -g -G -o $@ $+

clean:
	rm -f concurrent

clobber: clean
