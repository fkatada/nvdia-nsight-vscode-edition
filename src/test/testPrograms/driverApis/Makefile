all: build

build: driverApis kernel.fatbin

driverApis: driverApis.cpp
	nvcc -arch=sm_75 -g -G -o $@ $+ -lcuda

kernel.fatbin: kernel.cu
	nvcc -arch=sm_75 -g -G -o $@ $+ -fatbin

clean:
	rm -f driverApis
	rm -f kernel.fatbin

clobber: clean
