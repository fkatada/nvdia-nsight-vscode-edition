#pragma once

#if defined(assert)
#undef assert
#endif

#define assert(c) \
    do { \
        if(!(c)) { \
            fprintf(stderr, "Assertion \"%s\" failed. (%s:%d)\n", \
                #c, __FILE__, __LINE__); \
            exit(1); \
        } \
    } while(0)

#define assertSucceeded(c) \
    do { \
        unsigned __tmp = c; \
        if(__tmp != cudaSuccess) { \
            fprintf(stderr, "Operation \"%s\" failed with error code %x. (%s:%d)\n", \
                #c, (__tmp), __FILE__, __LINE__); \
            exit(__tmp); \
        } \
    } while(0)
