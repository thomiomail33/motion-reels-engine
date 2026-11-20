from sfxlib import *
DUR = 12
m = Mix(DUR)
m.bed(bed_noise(DUR, 200, 900, 1), .006)            # quiet room tone
for k in range(14):                                  # phone scroll ticks under the clock run
    m.add(1.0 + k * .3, tick(), .035)
m.add(3.3, pop(), .06)                               # lamp clicks off
m.add(5.4, whoosh(.5), .03)                          # clock jumps to morning
m.add(6.0, chime(2093), .07)                         # alarm
m.add(6.4, chime(2093), .05)
m.add(7.1, rise_chime(), .07)                        # book side: wakes up bright
m.add(7.6, step(), .08); m.add(8.2, step(), .08)     # phone side drags up
m.add(9.0, low_tone(), .08)                          # the sting
m.typing([[0.6, 'SAME NIGHT.'], [6.0, '', 'DIFFERENT MORNING.']])
m.save('sfx_out.wav')
