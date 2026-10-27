from pathlib import Path
import subprocess,json
p=Path('docs/qa/global-visual-lab/river-soil-layer-motion')
records=[]
for phase in ['day','night']:
 target=p/f'media-{phase}.mp4'
 subprocess.run(['C:/ffmpeg/bin/ffmpeg.exe','-hide_banner','-loglevel','error','-y','-framerate','12','-i',str(p/f'gran-rio-media-base-{phase}'/'%04d.png'),'-framerate','12','-i',str(p/f'gran-rio-media-combined-{phase}'/'%04d.png'),'-filter_complex','hstack=inputs=2','-frames:v','36','-c:v','libx264','-threads','4','-crf','24','-pix_fmt','yuv420p',str(target)],check=True)
 info=json.loads(subprocess.check_output(['C:/ffmpeg/bin/ffprobe.exe','-v','error','-select_streams','v:0','-show_entries','stream=width,height,nb_frames,r_frame_rate,duration','-of','json',str(target)]))
 stream=info['streams'][0];assert stream['nb_frames']=='36' and stream['r_frame_rate']=='12/1'
 records.append(dict(phase=phase,**stream))
(p/'video-metadata.json').write_text(json.dumps(dict(note='36 captures at 12 fps, visual simulation dt 1/30: slowed replay, not measured game fps.',videos=records),indent=2)+'\n',encoding='utf-8',newline='\n')
print(records)
