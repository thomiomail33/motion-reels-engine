from sfxlib import *
DUR = 12
m = Mix(DUR)
m.bed(bed_noise(DUR, 200, 900, 1), .005)
for k in range(40):                                   # pencil scratches while the planner writes
    m.add(.9 + k * .17, tick(), .02)
for i in range(7):                                    # each new step lands, then the doer hops onto it
    t = 1.2 + i * .95
    m.add(t + .15, thud(), .13)
    m.add(t + .7, step(), .09)
m.add(7.9, rise_chime(), .08)                         # reaches the top
m.add(10.0, pop(), .06)                               # "OKAY. NEW PLAN."
m.typing([[0.6, 'SAME 90 DAYS.'], [7.8, '', "PLANS DON'T CLIMB."]])
m.save('sfx_out.wav')
