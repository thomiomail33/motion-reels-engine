# Sound for one reel. Every sound must match something visible on screen, at the moment it happens.
# Mixed quiet: the owner adds trending audio in Instagram on top. Keep gains in the ranges shown.
from sfxlib import *

DUR = 12                       # must equal DUR in the scene file
m = Mix(DUR)
m.bed(bed_noise(DUR, 200, 900, 1), .005)   # optional very low room tone

# Events (time in seconds, sound, gain)
# m.add(3.2, pop(), .06)          # bubble / tag appears             (.04-.08)
# m.add(4.0, clink(), .06)        # coin / small object              (.03-.08)
# m.add(5.1, thud(), .14)         # block / object lands             (.10-.16)
# m.add(5.0, whoosh(.4), .03)     # time jump, something flies       (.02-.04)
# m.add(6.0, chime(2093), .07)    # alarm / notification             (.05-.08)
# m.add(9.0, low_tone(), .08)     # the sting / bad outcome          (.07-.09)
# m.add(8.0, rise_chime(), .08)   # the good side wins               (.06-.09)
# m.add(t, step(), .08)           # footsteps, hops                  (.06-.10)
# for k in range(20): m.add(1 + k*.3, tick(), .03)   # scrolling, writing, clock ticking
# Also available: splash(), kick_can(), rattle(.6), fall_whistle(), tick()

# Typing ticks: copy the captions() beats. When line 1 repeats from the beat before, pass '' for it.
m.typing([
    [0.6, 'SAME <UNIT>.'],
    [7.5, '', 'DIFFERENT <RESULT>.'],
])
m.save('sfx_out.wav')
