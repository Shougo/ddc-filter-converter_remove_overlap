# ddc-converter_remove_overlap

Removes overlapped text for ddc.vim

The filter removes overlapped text in a candidate's word.

For example if you want to complete "foobar" before "bar", only "foo" is
inserted. Because "bar" is already inserted in the text. It is useful if you
want to replace texts.

## Required

### denops.vim

https://github.com/vim-denops/denops.vim

### ddc.vim

https://github.com/Shougo/ddc.vim

## Configuration

```vim
call ddc#custom#patch_global('sourceOptions', #{
      \   _: #{
      \     converters: ['converter_remove_overlap'],
      \ })
```
