# ddc-converter_remove_overlap

Removes overlapped text for ddc.vim

The filter removes overlapped text in a candidate's word.


## Required

### denops.vim

https://github.com/vim-denops/denops.vim

### ddc.vim

https://github.com/Shougo/ddc.vim


## Configuration

```vim
" Use converter_remove_overlap.
call ddc#custom#patch_global('sourceOptions', {
      \ '_': {
      \   'converters': ['converter_remove_overlap'],
      \ })
```
