# Money Mind Visuals - sound effect library (subtle, action-synced). Build a reel's audio with Mix(dur).
import numpy as np, wave
from scipy.signal import butter, sosfilt, fftconvolve
SR=48000
_rng=np.random.default_rng(5)
def bp(x,lo,hi,o=2): return sosfilt(butter(o,[lo,hi],'band',fs=SR,output='sos'),x)
def lpf(x,f,o=2): return sosfilt(butter(o,f,'low',fs=SR,output='sos'),x)
def tt(d): return np.arange(int(d*SR))/SR
def env(t,a,d): return np.minimum(t/a,1)*np.exp(-t/d)
def nz(x): m=np.max(np.abs(x)); return x/m if m else x
def noise(n): return _rng.standard_normal(n)
# ---- sounds ----
def tick():
    d=tt(.03); f0=_rng.uniform(2400,3000); return nz(np.sin(2*np.pi*f0*d)*env(d,.0005,.004)+bp(noise(len(d)),3000,8000)*env(d,.0003,.002)*.5)
def step():
    d=tt(.09); return nz(lpf(noise(len(d)),900)*env(d,.002,.018)+np.sin(2*np.pi*95*d)*env(d,.002,.03))
def pop():
    d=tt(.16); f=380+480*(1-np.exp(-d*40)); return nz(np.sin(2*np.pi*np.cumsum(f)/SR)*env(d,.002,.04))
def chime(base=1568):
    d=tt(1.2); s=sum(a*np.sin(2*np.pi*f*d)*np.exp(-d/dd) for f,a,dd in [(base,1,.35),(base*1.5,.5,.25),(base*2,.25,.18)])
    s2=np.zeros_like(s); k=int(.09*SR); s2[k:]=s[:-k]; return nz((s*.6+s2)*np.minimum(d/.003,1))
def clink():
    d=tt(.35); s=sum(a*np.sin(2*np.pi*f*_rng.uniform(.97,1.03)*d)*np.exp(-d/dd) for f,a,dd in [(2637,1,.12),(3951,.6,.08),(5274,.35,.05)]); return nz(s*np.minimum(d/.001,1))
def thud():
    d=tt(.35); s=np.sin(2*np.pi*np.cumsum(110*np.exp(-d*8)+50)/SR)*env(d,.002,.07)+lpf(bp(noise(len(d)),200,2500),2000)*env(d,.001,.05)*1.2; return nz(s)
def whoosh(dur=.45):
    d=tt(dur); return nz(bp(noise(len(d)),600,3500)*np.sin(np.pi*d/dur)**2)
def low_tone(f1=220,f2=174.6):
    d=tt(1.6); a=(np.sin(2*np.pi*f1*d)+.3*np.sin(4*np.pi*f1*d))*env(d,.01,.35); b=np.zeros_like(d); k=int(.25*SR); bb=(np.sin(2*np.pi*f2*d)+.3*np.sin(4*np.pi*f2*d))*env(d,.01,.45); b[k:]=bb[:-k]; return nz(a+b)
def rise_chime():
    d=tt(1.4); out=np.zeros_like(d)
    for i,f in enumerate([784,988,1175,1568]):
        k=int(i*.09*SR); dd=d[:len(d)-k]; out[k:]+=np.sin(2*np.pi*f*dd)*np.exp(-dd/.5)*np.minimum(dd/.003,1)
    return nz(out)
def splash():
    d=tt(.4); return nz(bp(noise(len(d)),800,6000)*env(d,.01,.08)+lpf(noise(len(d)),600)*env(d,.005,.05)*.6)
def kick_can():
    d=tt(.5); s=sum(a*np.sin(2*np.pi*f*d)*np.exp(-d/dd) for f,a,dd in [(820,1,.09),(1460,.6,.06),(2310,.4,.04)])+bp(noise(len(d)),1500,6000)*env(d,.0005,.01)*.6; return nz(s)
def rattle(dur=.6):
    d=tt(dur); out=np.zeros_like(d)
    for k in np.sort(_rng.uniform(0,dur*.8,7)):
        i=int(k*SR); c=kick_can()[:int(.12*SR)]*_rng.uniform(.2,.5); n=min(len(c),len(out)-i); out[i:i+n]+=c[:n]
    return nz(out)*np.exp(-d/(dur*.6))
def fall_whistle(dur=1.4):
    d=tt(dur); f=1400*np.exp(-d*1.1)+300; return nz(np.sin(2*np.pi*np.cumsum(f)/SR)*np.minimum(d/.1,1)*np.exp(-d/1.2))
def bed_noise(dur,lo,hi,level):
    return nz(bp(noise(int(dur*SR)),lo,hi))*level
class Mix:
    def __init__(s,dur): s.dur=dur; s.N=int(dur*SR); s.out=np.zeros(s.N)
    def add(s,t,sig,gain):
        i=int(t*SR);
        if i<0 or i>=s.N: return
        n=min(len(sig),s.N-i); s.out[i:i+n]+=sig[:n]*gain
    def bed(s,sig,gain):
        n=min(len(sig),s.N); s.out[:n]+=sig[:n]*gain
    def typing(s,beats,cps=20,gain=.05):
        for b in beats:
            t0,a=b[0],b[1]; b2=b[2] if len(b)>2 else ''
            for j,ch in enumerate(a):
                if ch!=' ': s.add(t0+j/cps,tick(),gain)
            t1=t0+(len(a)/cps+.25 if a else 0)
            for j,ch in enumerate(b2):
                if ch!=' ': s.add(t1+j/cps,tick(),gain*.8)
    def save(s,path,boost=1.6):
        T=np.arange(s.N)/SR; fade=np.clip(T/.5,0,1)*(1-np.clip((T-(s.dur-.6))/.6,0,1))
        o=s.out*fade
        ir_t=tt(.4); ir=noise(len(ir_t))*np.exp(-ir_t/.08); ir=lpf(ir,4000); ir/=np.sqrt(np.sum(ir**2))
        m=np.clip((o+fftconvolve(o,ir)[:s.N]*.15)*boost,-1,1)
        y=(np.stack([m,m],1)*32767).astype(np.int16)
        w=wave.open(path,'wb'); w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR); w.writeframes(y.tobytes()); w.close()
